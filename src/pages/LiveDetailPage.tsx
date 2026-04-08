import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Calendar, Clock, Users, Globe, IndianRupee, Copy,
  ExternalLink, Radio, Eye, Check, X, Pencil
} from "lucide-react";
import { format, formatDistanceToNow, isFuture } from "date-fns";

const LiveDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingUrl, setEditingUrl] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [editingReplay, setEditingReplay] = useState(false);
  const [replayUrl, setReplayUrl] = useState("");

  const { data: session, isLoading } = useQuery({
    queryKey: ["live-session", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      setMeetingUrl(data.meeting_url || "");
      setReplayUrl(data.replay_url || "");
      return data;
    },
    enabled: !!id,
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ["live-registrations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_registrations")
        .select("*")
        .eq("session_id", id!)
        .order("registered_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const updateSession = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("live_sessions").update(updates as any).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-session", id] });
      toast.success("Updated");
    },
  });

  const updateReg = useMutation({
    mutationFn: async ({ regId, updates }: { regId: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("live_registrations").update(updates as any).eq("id", regId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-registrations", id] });
    },
  });

  if (isLoading || !session) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  const isLive = session.status === "live";
  const isScheduled = session.status === "scheduled";
  const isEnded = session.status === "ended";
  const publicUrl = `${window.location.origin}/s/${session.slug}`;

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/live")} className="h-8 w-8">
            <ArrowLeft size={16} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-heading font-bold truncate">{session.title}</h1>
            <p className="text-xs text-muted-foreground">{session.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {isScheduled && (
              <Button variant="hero" size="sm" onClick={() => updateSession.mutate({ status: "live" })}>
                <Radio size={14} /> Go Live
              </Button>
            )}
            {isLive && (
              <Button variant="outline" size="sm" onClick={() => updateSession.mutate({ status: "ended" })}>
                End Session
              </Button>
            )}
          </div>
        </div>

        {/* Status & Info Cards */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <p className={`text-lg font-bold ${isLive ? "text-emerald-500" : isScheduled ? "text-blue-500" : "text-muted-foreground"}`}>
              {isLive ? "🔴 LIVE" : session.status.toUpperCase()}
            </p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Registrations</p>
            <p className="text-lg font-bold">{registrations.length}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Scheduled</p>
            <p className="text-sm font-semibold">
              {session.scheduled_at ? format(new Date(session.scheduled_at), "MMM d, h:mm a") : "Not set"}
            </p>
          </div>
        </div>

        {/* Public Link */}
        <div className="glass-card p-4">
          <Label className="text-xs text-muted-foreground">Public Session Link</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-sm text-primary flex-1 truncate">{publicUrl}</code>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Copied!"); }}>
              <Copy size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(publicUrl, "_blank")}>
              <ExternalLink size={14} />
            </Button>
          </div>
        </div>

        {/* Meeting URL */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Meeting URL</Label>
            {!editingUrl ? (
              <Button variant="ghost" size="sm" onClick={() => setEditingUrl(true)}><Pencil size={12} className="mr-1" /> Edit</Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { updateSession.mutate({ meeting_url: meetingUrl }); setEditingUrl(false); }}>
                  <Check size={12} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingUrl(false)}><X size={12} /></Button>
              </div>
            )}
          </div>
          {editingUrl ? (
            <Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} className="bg-muted border-border" />
          ) : (
            <p className="text-sm text-muted-foreground">{session.meeting_url || "No URL added yet"}</p>
          )}
        </div>

        {/* Replay URL */}
        {session.replay_enabled && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Replay URL</Label>
              {!editingReplay ? (
                <Button variant="ghost" size="sm" onClick={() => setEditingReplay(true)}><Pencil size={12} className="mr-1" /> Edit</Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { updateSession.mutate({ replay_url: replayUrl }); setEditingReplay(false); }}>
                    <Check size={12} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingReplay(false)}><X size={12} /></Button>
                </div>
              )}
            </div>
            {editingReplay ? (
              <Input value={replayUrl} onChange={(e) => setReplayUrl(e.target.value)} className="bg-muted border-border" placeholder="Add replay URL after session ends" />
            ) : (
              <p className="text-sm text-muted-foreground">{session.replay_url || "No replay URL yet"}</p>
            )}
          </div>
        )}

        {/* Registrations */}
        <div className="glass-card p-4">
          <h3 className="font-heading font-semibold text-sm mb-3">Registrations ({registrations.length})</h3>
          {registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No registrations yet. Share the public link to start collecting.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {registrations.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.name || "Anonymous"}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {r.phone && <span>{r.phone}</span>}
                      {r.email && <span>{r.email}</span>}
                      {r.city && <span>{r.city}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.access_type === "paid" && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        r.payment_status === "verified" ? "bg-emerald-500/10 text-emerald-500" :
                        r.payment_status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {r.payment_status || "none"}
                      </span>
                    )}
                    {r.attended ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">Attended</span>
                    ) : isLive ? (
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => updateReg.mutate({ regId: r.id, updates: { attended: true, attended_at: new Date().toISOString() } })}>
                        Mark Attended
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LiveDetailPage;
