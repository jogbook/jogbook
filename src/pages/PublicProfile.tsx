import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProfileBySlug } from "@/lib/supabase-helpers";
import { BookingForm } from "@/components/BookingForm";
import { MapPin, Music, ExternalLink, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold tracking-tighter">
            <span className="text-primary">jog</span>
            <span className="text-foreground">book</span>
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Hero */}
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          {profile.photo_url && (
            <img
              src={profile.photo_url}
              alt={profile.name}
              className="w-32 h-32 rounded-lg object-cover border border-border"
            />
          )}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">{profile.name}</h1>
            {profile.location && (
              <p className="flex items-center gap-1 text-muted-foreground">
                <MapPin size={16} /> {profile.location}
              </p>
            )}
            {profile.genres && profile.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.genres.map((g: string) => (
                  <Badge key={g} variant="outline" className="border-primary/30 text-primary">{g}</Badge>
                ))}
              </div>
            )}
            {profile.bio && <p className="text-muted-foreground max-w-lg">{profile.bio}</p>}
          </div>
        </div>

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {socialLinks.map((link: any, i: number) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink size={14} />
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* Music */}
        {musicLinks.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Music size={18} /> Music & Mixes</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {musicLinks.map((link: any, i: number) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-secondary"
                  >
                    <ExternalLink size={14} />
                    {link.label || link.url}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar size={18} /> Past Events</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pastEvents.map((ev: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary">
                    <span className="text-sm font-medium">{ev.name}</span>
                    {ev.date && <span className="text-xs text-muted-foreground">{format(new Date(ev.date), "MMM d, yyyy")}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle>Book {profile.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingForm djId={profile.id} djName={profile.name} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
