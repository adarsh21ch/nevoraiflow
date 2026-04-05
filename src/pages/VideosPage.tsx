import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Video, FolderPlus, Search, Upload, Grid, List } from "lucide-react";

const VideosPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["videos", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("video_assets").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["video-folders", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("video_folders").select("*").eq("owner_id", user!.id).order("position");
      return data || [];
    },
    enabled: !!user,
  });

  const filtered = videos.filter((v) => !search || v.title.toLowerCase().includes(search.toLowerCase()));

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-heading font-bold">Video Gallery</h1>
          <Button variant="hero"><Upload size={16} /> Upload Video</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search videos..." className="pl-9 bg-muted border-border" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button onClick={() => setView("grid")} className={`p-2 rounded-md ${view === "grid" ? "bg-card shadow-sm" : ""}`}><Grid size={16} /></button>
            <button onClick={() => setView("list")} className={`p-2 rounded-md ${view === "list" ? "bg-card shadow-sm" : ""}`}><List size={16} /></button>
          </div>
        </div>

        {/* Folders */}
        {folders.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button className="px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary whitespace-nowrap">All Videos ({videos.length})</button>
            {folders.map((f) => (
              <button key={f.id} className="px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color || "#2563EB" }} />
                {f.name}
              </button>
            ))}
            <button className="px-3 py-1.5 text-xs rounded-lg border border-dashed border-border text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <FolderPlus size={12} /> New Folder
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Video size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-heading font-semibold mb-2">{search ? "No videos found" : "No videos yet"}</h3>
            <p className="text-sm text-muted-foreground mb-6">Upload your first video to get started.</p>
            <Button variant="hero"><Upload size={16} /> Upload Video</Button>
          </div>
        ) : (
          <div className={view === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
            {filtered.map((v) => (
              <div key={v.id} className="glass-card-hover p-4">
                <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                  {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover rounded-lg" /> :
                    <Video size={24} className="text-muted-foreground" />}
                </div>
                <h3 className="font-medium text-sm truncate">{v.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{formatSize(v.file_size_bytes)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${v.status === "ready" ? "bg-success/10 text-success" : v.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                    {v.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VideosPage;
