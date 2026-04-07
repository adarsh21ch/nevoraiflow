import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const RAZORPAY_API = "https://api.razorpay.com/v1";

function rzpHeaders() {
  return {
    Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, plan_key, amount, receipt } = await req.json();

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "create_order") {
      // Create a Razorpay order for one-time payment
      if (!amount || !plan_key) {
        return new Response(JSON.stringify({ error: "amount and plan_key required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orderRes = await fetch(`${RAZORPAY_API}/orders`, {
        method: "POST",
        headers: rzpHeaders(),
        body: JSON.stringify({
          amount: Math.round(amount * 100), // paise
          currency: "INR",
          receipt: receipt || `order_${user.id}_${Date.now()}`,
          notes: { user_id: user.id, plan_key },
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.text();
        console.error("Razorpay order error:", err);
        return new Response(JSON.stringify({ error: "Failed to create order" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const order = await orderRes.json();

      // Log the order creation
      await serviceClient.from("payment_audit_logs").insert({
        user_id: user.id,
        event_type: "order_created",
        razorpay_order_id: order.id,
        payload: { plan_key, amount },
        source: "frontend",
        idempotency_key: `order_${order.id}`,
      });

      return new Response(JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: RAZORPAY_KEY_ID,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "verify_payment") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json().catch(() => ({}));
      
      // Re-parse body since we already consumed it
      const body = { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_key };

      if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
        return new Response(JSON.stringify({ error: "Missing payment verification fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(RAZORPAY_KEY_SECRET),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const data = encoder.encode(`${body.razorpay_order_id}|${body.razorpay_payment_id}`);
      const sig = await crypto.subtle.sign("HMAC", key, data);
      const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

      if (expectedSig !== body.razorpay_signature) {
        await serviceClient.from("payment_audit_logs").insert({
          user_id: user.id,
          event_type: "payment_verification_failed",
          razorpay_order_id: body.razorpay_order_id,
          razorpay_payment_id: body.razorpay_payment_id,
          source: "frontend",
          idempotency_key: `verify_fail_${body.razorpay_payment_id}`,
        });
        return new Response(JSON.stringify({ error: "Signature mismatch" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch plan details
      const { data: planData } = await serviceClient.from("admin_subscription_plans")
        .select("*").eq("plan_key", plan_key).eq("is_active", true).single();

      const now = new Date();
      let expiresAt = null;
      if (planData?.duration_days) {
        expiresAt = new Date(now.getTime() + planData.duration_days * 86400000).toISOString();
      }

      // Deactivate old subscriptions
      await serviceClient.from("user_subscriptions")
        .update({ status: "replaced" })
        .eq("user_id", user.id)
        .eq("status", "active");

      // Create new subscription record
      await serviceClient.from("user_subscriptions").insert({
        user_id: user.id,
        plan_key: plan_key,
        tier: planData?.tier || "pro",
        status: "active",
        billing_type: planData?.billing_type || "one_time",
        amount_paid: Math.round((planData?.price_inr || amount) as number),
        razorpay_order_id: body.razorpay_order_id,
        razorpay_payment_id: body.razorpay_payment_id,
        started_at: now.toISOString(),
        expires_at: expiresAt,
      });

      // Log success
      await serviceClient.from("payment_audit_logs").insert({
        user_id: user.id,
        event_type: "payment_verified",
        razorpay_order_id: body.razorpay_order_id,
        razorpay_payment_id: body.razorpay_payment_id,
        payload: { plan_key, tier: planData?.tier },
        source: "frontend",
        idempotency_key: `verify_${body.razorpay_payment_id}`,
      });

      return new Response(JSON.stringify({ success: true, plan_key, tier: planData?.tier }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_config") {
      // Return public Razorpay key and plan info
      const { data: plans } = await serviceClient.from("admin_subscription_plans")
        .select("*").eq("is_active", true).order("price_inr");

      const { data: settings } = await serviceClient.from("platform_settings")
        .select("key, value")
        .in("key", ["support_whatsapp", "support_message_template", "razorpay_monthly_price", "razorpay_onetime_price", "razorpay_onetime_validity_days", "razorpay_onetime_is_lifetime"]);

      const settingsMap: Record<string, string> = {};
      settings?.forEach((s: any) => { settingsMap[s.key] = s.value; });

      return new Response(JSON.stringify({
        key_id: RAZORPAY_KEY_ID,
        plans: plans || [],
        settings: settingsMap,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("razorpay-portal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
