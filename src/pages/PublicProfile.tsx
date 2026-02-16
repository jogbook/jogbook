import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProfileBySlug } from "@/lib/supabase-helpers";
import { BookingForm } from "@/components/BookingForm";
import { MapPin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">DJ Not Found</h1>
          <p className="text-neutral-500">This profile doesn't exist.</p>
        </div>
      </div>
    );
  }

  const musicLinks = Array.isArray(profile.music_links) ? (profile.music_links as any[]) : [];
  const socialLinks = Array.isArray(profile.social_links) ? (profile.social_links as any[]) : [];
  const pastEvents = Array.isArray(profile.past_events) ? (profile.past_events as any[]) : [];

  const soundcloudLink = musicLinks.find((l) => l.url?.includes("soundcloud.com"));
  const otherMusicLinks = musicLinks.filter((l) => !l.url?.includes("soundcloud.com"));

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Hero banner */}
      {profile.photo_url && (
        <div className="w-full h-48 sm:h-64 md:h-80 overflow-hidden relative bg-neutral-200">
          <img
            src={profile.photo_url}
            alt={profile.name}
            className="w-full h-full object-cover object-top"
          />
        </div>
      )}

      {/* Profile info */}
      <div className="max-w-5xl mx-auto px-6 relative">
        <div className="flex items-end gap-4 -mt-14 relative z-10">
          {profile.photo_url && (
            <img
              src={profile.photo_url}
              alt={profile.name}
              className="w-20 h-20 rounded-lg object-cover border-[3px] border-primary shadow-lg"
            />
          )}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 pb-1">
            {profile.name}
          </h1>
        </div>

        {profile.location && (
          <p className="flex items-center gap-1.5 text-neutral-500 mt-3 text-sm">
            <MapPin size={14} /> {profile.location}
          </p>
        )}

        {profile.bio && (
          <p className="text-neutral-600 mt-3 text-sm max-w-lg">{profile.bio}</p>
        )}

        <hr className="my-6 border-primary/60" />

        {/* Genre */}
        {profile.genres && profile.genres.length > 0 && (
          <>
            <section>
              <h2 className="text-sm font-bold mb-3 text-neutral-900">Genre</h2>
              <div className="flex flex-wrap gap-2">
                {profile.genres.map((g: string) => (
                  <span
                    key={g}
                    className="border border-primary text-primary text-xs font-semibold px-3 py-1 rounded-full"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </section>
            <hr className="my-6 border-primary/60" />
          </>
        )}

        {/* Press Kit */}
        {pastEvents.length > 0 && (
          <>
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-900">Press Kit</h2>
                <ExternalLink size={16} className="text-neutral-400" />
              </div>
              <div className="mt-2 space-y-1">
                {pastEvents.map((ev: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 text-sm">
                    <span>{ev.name}</span>
                    {ev.date && <span className="text-neutral-400 text-xs">{ev.date}</span>}
                  </div>
                ))}
              </div>
            </section>
            <hr className="my-6 border-primary/60" />
          </>
        )}

        {/* SoundCloud embed */}
        {soundcloudLink && (
          <>
            <section>
              <h2 className="text-sm font-bold mb-3 text-neutral-900">SoundCloud</h2>
              <div className="rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200">
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
            <hr className="my-6 border-primary/60" />
          </>
        )}

        {/* Music links */}
        {otherMusicLinks.length > 0 && (
          <>
            <section>
              <h2 className="text-sm font-bold mb-3 text-neutral-900">Music</h2>
              <div className="space-y-0">
                {otherMusicLinks.map((link: any, i: number) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-3 text-sm text-neutral-700 hover:text-primary transition-colors"
                  >
                    <span>{link.label || link.url}</span>
                    <ExternalLink size={16} className="text-neutral-400" />
                  </a>
                ))}
              </div>
            </section>
            <hr className="my-6 border-primary/60" />
          </>
        )}

        {/* Social links */}
        {socialLinks.length > 0 && (
          <>
            <section>
              <h2 className="text-sm font-bold mb-3 text-neutral-900">Social links</h2>
              <div className="space-y-0">
                {socialLinks.map((link: any, i: number) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-3 text-sm text-neutral-700 hover:text-primary transition-colors"
                  >
                    <span>{link.label}</span>
                    <ExternalLink size={16} className="text-neutral-400" />
                  </a>
                ))}
              </div>
            </section>
            <hr className="my-6 border-primary/60" />
          </>
        )}

        <div className="h-24" />
      </div>

      {/* Sticky bottom bar - dark with green button */}
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
