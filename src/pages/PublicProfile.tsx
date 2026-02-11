import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProfileBySlug } from "@/lib/supabase-helpers";
import { BookingForm } from "@/components/BookingForm";
import { MapPin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", slug],
    queryFn: () => getProfileBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">DJ Not Found</h1>
          <p className="text-muted-foreground">This profile doesn't exist.</p>
        </div>
      </div>
    );
  }

  const musicLinks = Array.isArray(profile.music_links) ? (profile.music_links as any[]) : [];
  const socialLinks = Array.isArray(profile.social_links) ? (profile.social_links as any[]) : [];
  const pastEvents = Array.isArray(profile.past_events) ? (profile.past_events as any[]) : [];

  // Find a SoundCloud link for embedding
  const soundcloudLink = musicLinks.find(
    (l) => l.url?.includes("soundcloud.com")
  );
  const otherMusicLinks = musicLinks.filter(
    (l) => !l.url?.includes("soundcloud.com")
  );

  return (
    <div className="min-h-screen bg-foreground text-background">
      {/* Hero banner area */}
      {profile.photo_url && (
        <div className="w-full h-48 sm:h-64 md:h-80 overflow-hidden relative bg-muted">
          <img
            src={profile.photo_url}
            alt={profile.name}
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
        </div>
      )}

      {/* Profile info overlapping banner */}
      <div className="max-w-3xl mx-auto px-6 relative">
        <div className="flex items-end gap-4 -mt-16 relative z-10">
          {profile.photo_url && (
            <img
              src={profile.photo_url}
              alt={profile.name}
              className="w-20 h-20 rounded-lg object-cover border-[3px] border-primary shadow-lg"
            />
          )}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight pb-1">
            {profile.name}
          </h1>
        </div>

        {profile.location && (
          <p className="flex items-center gap-1.5 text-background/60 mt-3 text-sm">
            <MapPin size={14} /> {profile.location}
          </p>
        )}

        {profile.bio && (
          <p className="text-background/70 mt-3 text-sm max-w-lg">{profile.bio}</p>
        )}

        <Separator className="my-6 bg-primary/40" />

        {/* Genre */}
        {profile.genres && profile.genres.length > 0 && (
          <>
            <section>
              <h2 className="text-sm font-bold mb-3">Genre</h2>
              <div className="flex flex-wrap gap-2">
                {profile.genres.map((g: string) => (
                  <Badge
                    key={g}
                    className="bg-primary text-primary-foreground font-medium text-xs px-3 py-1 rounded-full"
                  >
                    {g}
                  </Badge>
                ))}
              </div>
            </section>
            <Separator className="my-6 bg-primary/40" />
          </>
        )}

        {/* Press Kit / Past Events */}
        {pastEvents.length > 0 && (
          <>
            <section>
              <h2 className="text-sm font-bold mb-3">Press Kit</h2>
              <div className="space-y-1">
                {pastEvents.map((ev: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span>{ev.name}</span>
                    {ev.date && (
                      <span className="text-background/50 text-xs">{ev.date}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <Separator className="my-6 bg-primary/40" />
          </>
        )}

        {/* SoundCloud embed */}
        {soundcloudLink && (
          <>
            <section>
              <h2 className="text-sm font-bold mb-3">SoundCloud</h2>
              <div className="rounded-lg overflow-hidden bg-background/5 border border-background/10">
                <iframe
                  width="100%"
                  height="166"
                  scrolling="no"
                  frameBorder="no"
                  allow="autoplay"
                  src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudLink.url)}&color=%2300ff00&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
                  className="w-full"
                />
              </div>
            </section>
            <Separator className="my-6 bg-primary/40" />
          </>
        )}

        {/* Other music links */}
        {otherMusicLinks.length > 0 && (
          <>
            <section>
              <h2 className="text-sm font-bold mb-3">Music</h2>
              <div className="space-y-1">
                {otherMusicLinks.map((link: any, i: number) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-2 text-sm hover:text-primary transition-colors"
                  >
                    <span>{link.label || link.url}</span>
                    <ExternalLink size={14} className="text-background/40" />
                  </a>
                ))}
              </div>
            </section>
            <Separator className="my-6 bg-primary/40" />
          </>
        )}

        {/* Social links */}
        {socialLinks.length > 0 && (
          <>
            <section>
              <h2 className="text-sm font-bold mb-3">Social links</h2>
              <div className="space-y-1">
                {socialLinks.map((link: any, i: number) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors"
                  >
                    <span>{link.label}</span>
                    <ExternalLink size={14} className="text-background/40" />
                  </a>
                ))}
              </div>
            </section>
            <Separator className="my-6 bg-primary/40" />
          </>
        )}

        {/* Spacer for sticky button */}
        <div className="h-24" />
      </div>

      {/* Sticky bottom bar with Submit Request */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-6 py-3 flex items-center justify-between">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <div className="flex items-center cursor-pointer text-foreground">
              {sheetOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Book {profile.name}</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <BookingForm djId={profile.id} djName={profile.name} />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button className="flex-1 max-w-md mx-auto font-bold text-base h-12 rounded-lg">
              Submit Request
            </Button>
          </SheetTrigger>
        </Sheet>
      </div>
    </div>
  );
}
