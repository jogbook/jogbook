import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/lib/supabase-helpers";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

export default function ProfileEditor() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [genres, setGenres] = useState("");
  const [location, setLocation] = useState("");
  const [slug, setSlug] = useState("");
  const [musicLinks, setMusicLinks] = useState<{ label: string; url: string }[]>([]);
  const [socialLinks, setSocialLinks] = useState<{ label: string; url: string }[]>([]);
  const [pastEvents, setPastEvents] = useState<{ name: string; date: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setBio(profile.bio || "");
      setPhotoUrl(profile.photo_url || "");
      setGenres((profile.genres || []).join(", "));
      setLocation(profile.location || "");
      setSlug(profile.slug || "");
      setMusicLinks(Array.isArray(profile.music_links) ? profile.music_links as any[] : []);
      setSocialLinks(Array.isArray(profile.social_links) ? profile.social_links as any[] : []);
      setPastEvents(Array.isArray(profile.past_events) ? profile.past_events as any[] : []);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(profile.id, {
        name,
        bio,
        photo_url: photoUrl,
        genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
        location,
        slug,
        music_links: musicLinks,
        social_links: socialLinks,
        past_events: pastEvents,
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved!");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
    setSaving(false);
  };

  if (isLoading) return <DashboardLayout><div className="p-8 text-muted-foreground">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground mt-1">Edit your DJ profile</p>
          </div>
          {slug && (
            <a href={`/dj/${slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline">
              <ExternalLink size={14} /> Preview
            </a>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>DJ Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-background min-h-[100px]" />
            </div>
            <div className="space-y-2">
              <Label>Photo URL</Label>
              <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." className="bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Genres (comma separated)</Label>
                <Input value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="House, Techno, Hip-Hop" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="New York, NY" className="bg-background" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Profile Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="dj-name" className="bg-background" />
              <p className="text-xs text-muted-foreground">Your public URL: /dj/{slug || "your-slug"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Music Links</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setMusicLinks([...musicLinks, { label: "", url: "" }])}><Plus size={14} /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {musicLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Label" value={link.label} onChange={(e) => { const n = [...musicLinks]; n[i].label = e.target.value; setMusicLinks(n); }} className="bg-background" />
                <Input placeholder="URL" value={link.url} onChange={(e) => { const n = [...musicLinks]; n[i].url = e.target.value; setMusicLinks(n); }} className="bg-background flex-1" />
                <Button size="icon" variant="ghost" onClick={() => setMusicLinks(musicLinks.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Social Links</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setSocialLinks([...socialLinks, { label: "", url: "" }])}><Plus size={14} /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {socialLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Platform" value={link.label} onChange={(e) => { const n = [...socialLinks]; n[i].label = e.target.value; setSocialLinks(n); }} className="bg-background" />
                <Input placeholder="URL" value={link.url} onChange={(e) => { const n = [...socialLinks]; n[i].url = e.target.value; setSocialLinks(n); }} className="bg-background flex-1" />
                <Button size="icon" variant="ghost" onClick={() => setSocialLinks(socialLinks.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Past Events</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setPastEvents([...pastEvents, { name: "", date: "" }])}><Plus size={14} /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastEvents.map((ev, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Event name" value={ev.name} onChange={(e) => { const n = [...pastEvents]; n[i].name = e.target.value; setPastEvents(n); }} className="bg-background flex-1" />
                <Input type="date" value={ev.date} onChange={(e) => { const n = [...pastEvents]; n[i].date = e.target.value; setPastEvents(n); }} className="bg-background" />
                <Button size="icon" variant="ghost" onClick={() => setPastEvents(pastEvents.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="font-bold">
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </DashboardLayout>
  );
}
