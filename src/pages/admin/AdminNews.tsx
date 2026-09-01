import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Newspaper, Plus, Trash2, Pin } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  body: string | null;
  content: string | null;
  image_url: string | null;
  category: string;
  link_url: string | null;
  is_published: boolean;
  pinned: boolean;
  created_at: string;
}

const CATEGORIES = ["news", "high_earner", "promotion", "achievement", "announcement"];

export default function AdminNews() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("news");
  const [linkUrl, setLinkUrl] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);


  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_items")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NewsItem[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-news"] });
    queryClient.invalidateQueries({ queryKey: ["news-feed"] });
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `news/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Banner uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const create = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("news_items").insert({
      title: title.trim(),
      body: body.trim() || null,
      content: content.trim() || null,
      image_url: imageUrl.trim() || null,
      category,
      link_url: linkUrl.trim() || null,
      pinned,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("News item published");
    setTitle(""); setBody(""); setContent(""); setImageUrl(""); setLinkUrl(""); setPinned(false);
    refresh();
  };


  const togglePublish = async (item: NewsItem) => {
    const { error } = await supabase
      .from("news_items")
      .update({ is_published: !item.is_published })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("news_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); refresh(); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">News & Highlights</h1>
          <p className="text-muted-foreground">Publish platform news, promotions and highlights to all users</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-5 w-5 text-primary" /> New item
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Machines now live!" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Link (optional)</Label>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/machines" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={pinned} onCheckedChange={setPinned} id="pin" />
                <Label htmlFor="pin">Pin to top</Label>
              </div>
            </div>
            <Button onClick={create} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Newspaper className="mr-2 h-4 w-4" />}
              Publish
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Published items</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !items?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing published yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 rounded-xl border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        {n.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                        <span className="truncate">{n.title}</span>
                        <Badge variant="outline" className="text-[10px]">{n.category}</Badge>
                      </p>
                      {n.body && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                    </div>
                    <Switch checked={n.is_published} onCheckedChange={() => togglePublish(n)} />
                    <Button size="icon" variant="ghost" onClick={() => remove(n.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
