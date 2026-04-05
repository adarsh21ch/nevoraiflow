import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const R2_ENDPOINT = Deno.env.get("R2_ENDPOINT") || "";
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID") || "";
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY") || "";
const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "";
const R2_PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL") || "";

async function signV4(method: string, url: URL, headers: Record<string, string>, body: string | null, accessKey: string, secretKey: string, region: string, service: string) {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z/, "Z");

  headers["x-amz-date"] = amzDate;
  headers["host"] = url.hostname;

  const sortedHeaders = Object.keys(headers).sort();
  const signedHeadersList = sortedHeaders.join(";");
  const canonicalHeaders = sortedHeaders.map((k) => `${k}:${headers[k]}\n`).join("");

  const bodyHash = body
    ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)))).map((b) => b.toString(16).padStart(2, "0")).join("")
    : "UNSIGNED-PAYLOAD";

  const canonicalRequest = [method, url.pathname, url.search.slice(1), canonicalHeaders, signedHeadersList, bodyHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest)))).map((b) => b.toString(16).padStart(2, "0")).join("")].join("\n");

  const enc = new TextEncoder();
  let key = await crypto.subtle.importKey("raw", enc.encode("AWS4" + secretKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  for (const msg of [dateStamp, region, service, "aws4_request"]) {
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
    key = await crypto.subtle.importKey("raw", sig, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  }
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(stringToSign)))).map((b) => b.toString(16).padStart(2, "0")).join("");

  return `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check admin
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { filename, contentType, title } = await req.json();
    if (!filename || !contentType) return new Response(JSON.stringify({ error: "Missing filename/contentType" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Create video_assets record
    const { data: video, error: dbErr } = await supabase.from("video_assets").insert({
      owner_id: user.id,
      title: title || filename,
      original_filename: filename,
      status: "uploading",
      is_shared: true,
    }).select("id").single();

    if (dbErr) throw dbErr;

    const r2Key = `videos/${video.id}/${filename}`;

    // Generate presigned PUT URL using S3-compatible API
    const expiresIn = 3600;
    const url = new URL(`${R2_ENDPOINT}/${R2_BUCKET_NAME}/${r2Key}`);
    url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
    const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z/, "Z");
    const region = "auto";
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    url.searchParams.set("X-Amz-Credential", `${R2_ACCESS_KEY_ID}/${credentialScope}`);
    url.searchParams.set("X-Amz-Date", amzDate);
    url.searchParams.set("X-Amz-Expires", String(expiresIn));
    url.searchParams.set("X-Amz-SignedHeaders", "host");
    url.searchParams.sort();

    const canonicalRequest = ["PUT", `/${R2_BUCKET_NAME}/${r2Key}`, url.searchParams.toString(), `host:${url.hostname}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest)))).map((b) => b.toString(16).padStart(2, "0")).join("")].join("\n");

    const enc = new TextEncoder();
    let key = await crypto.subtle.importKey("raw", enc.encode("AWS4" + R2_SECRET_ACCESS_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    for (const msg of [dateStamp, region, "s3", "aws4_request"]) {
      const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
      key = await crypto.subtle.importKey("raw", sig, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    }
    const signature = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(stringToSign)))).map((b) => b.toString(16).padStart(2, "0")).join("");
    url.searchParams.set("X-Amz-Signature", signature);

    // Update video with r2_key
    await supabase.from("video_assets").update({ r2_key: r2Key }).eq("id", video.id);

    return new Response(JSON.stringify({
      uploadUrl: url.toString(),
      videoId: video.id,
      r2Key,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
