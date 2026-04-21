import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { Disc3, CalendarHeart } from "lucide-react";
import jogbookLogo from "@/assets/jogbook-logo.png";

type Role = "dj" | "booker";
type Step = "role" | "details" | "account";

export default function Signup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // DJ
  const [stageName, setStageName] = useState("");
  const [genres, setGenres] = useState("");
  const [djLocation, setDjLocation] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [soundcloud, setSoundcloud] = useState("");
  const [instagram, setInstagram] = useState("");
  const [mixSets, setMixSets] = useState("");
  const [rate, setRate] = useState("");
  const [rateOnRequest, setRateOnRequest] = useState(false);

  // Booker
  const [fullName, setFullName] = useState("");
  const [companyOrEventType, setCompanyOrEventType] = useState("");
  const [bookerLocation, setBookerLocation] = useState("");
  const [phone, setPhone] = useState("");

  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleRoleSelect = (r: Role) => {
    setRole(r);
    setStep("details");
  };

  const validateDetails = (): boolean => {
    if (role === "dj") {
      if (!stageName.trim()) return toast.error("Stage name is required"), false;
      if (!genres.trim()) return toast.error("At least one genre is required"), false;
      if (!djLocation.trim()) return toast.error("Location is required"), false;
      if (!bio.trim()) return toast.error("Bio is required"), false;
    } else {
      if (!fullName.trim()) return toast.error("Full name is required"), false;
      if (!bookerLocation.trim()) return toast.error("Location is required"), false;
      if (!phone.trim()) return toast.error("Phone number is required"), false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    if (!acceptTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);

    const displayName = role === "dj" ? stageName : fullName;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { role, name: displayName },
      },
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      // The DB trigger created the base profile/role. Now persist extra fields.
      try {
        if (role === "dj") {
          const genreList = genres.split(",").map((g) => g.trim()).filter(Boolean);
          const social: { label: string; url: string }[] = [];
          if (instagram.trim()) social.push({ label: "Instagram", url: instagram.trim() });
          const music: { label: string; url: string }[] = [];
          if (soundcloud.trim()) music.push({ label: "SoundCloud", url: soundcloud.trim() });
          if (mixSets.trim())
            mixSets
              .split(/\n|,/)
              .map((u) => u.trim())
              .filter(Boolean)
              .forEach((url, i) => music.push({ label: `Mix ${i + 1}`, url }));

          await supabase
            .from("profiles")
            .update({
              name: stageName,
              stage_name: stageName,
              bio,
              location: djLocation,
              genres: genreList,
              photo_url: photoUrl || null,
              social_links: social,
              music_links: music,
              rate: rateOnRequest ? "" : rate,
              rate_on_request: rateOnRequest,
            })
            .eq("user_id", userId);
        } else {
          await supabase
            .from("booker_profiles")
            .update({
              full_name: fullName,
              company_or_event_type: companyOrEventType,
              location: bookerLocation,
              phone,
            })
            .eq("user_id", userId);
        }
      } catch (err) {
        // Non-fatal: account is created, profile fields can be edited later.
        console.error(err);
      }
    }

    toast.success("Check your email to confirm your account!");
    setSubmitting(false);
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10 relative grain-overlay overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-primary/5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/8 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-primary/10 pointer-events-none" />

      <div className="w-full max-w-lg space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <img src={jogbookLogo} alt="jogbook" className="h-14 w-auto mx-auto" />
          <p className="text-muted-foreground text-sm">
            {step === "role" && "Join jogbook"}
            {step === "details" && (role === "dj" ? "Tell us about your sound" : "Tell us about you")}
            {step === "account" && "Create your account"}
          </p>
        </div>

        {step === "role" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleRoleSelect("dj")}
              className="group flex flex-col items-center gap-3 p-8 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Disc3 className="text-primary group-hover:scale-110 transition-transform" size={40} />
              <span className="font-bold text-lg">I'm a DJ</span>
              <span className="text-xs text-muted-foreground text-center">
                Build your profile and get booked
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("booker")}
              className="group flex flex-col items-center gap-3 p-8 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all"
            >
              <CalendarHeart className="text-primary group-hover:scale-110 transition-transform" size={40} />
              <span className="font-bold text-lg">I'm a Booker</span>
              <span className="text-xs text-muted-foreground text-center">
                Discover DJs and book events
              </span>
            </button>
          </div>
        )}

        {step === "details" && role === "dj" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (validateDetails()) setStep("account");
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="stageName">Stage name</Label>
              <Input id="stageName" value={stageName} onChange={(e) => setStageName(e.target.value)} required className="bg-card border-border h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genres">Genre(s)</Label>
              <Input id="genres" placeholder="House, Techno, Disco" value={genres} onChange={(e) => setGenres(e.target.value)} required className="bg-card border-border h-11" />
              <p className="text-xs text-muted-foreground">Separate with commas</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="djLocation">Location / city</Label>
              <Input id="djLocation" value={djLocation} onChange={(e) => setDjLocation(e.target.value)} required className="bg-card border-border h-11" />
            </div>
            <div className="space-y-2">
              <Label>Profile photo</Label>
              <ImageUpload
                value={photoUrl}
                onChange={setPhotoUrl}
                userId="signup-temp"
                folder="signup-photos"
                aspectRatio="square"
                label="Upload"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} required rows={3} className="bg-card border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="soundcloud">SoundCloud</Label>
              <Input id="soundcloud" type="url" placeholder="https://soundcloud.com/..." value={soundcloud} onChange={(e) => setSoundcloud(e.target.value)} className="bg-card border-border h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" type="url" placeholder="https://instagram.com/..." value={instagram} onChange={(e) => setInstagram(e.target.value)} className="bg-card border-border h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixSets">Mix sets (one URL per line)</Label>
              <Textarea id="mixSets" value={mixSets} onChange={(e) => setMixSets(e.target.value)} rows={2} placeholder="https://mixcloud.com/..." className="bg-card border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate</Label>
              <Input id="rate" placeholder="$500/event" value={rate} onChange={(e) => setRate(e.target.value)} disabled={rateOnRequest} className="bg-card border-border h-11" />
              <div className="flex items-center gap-2">
                <Checkbox id="rateOnRequest" checked={rateOnRequest} onCheckedChange={(c) => setRateOnRequest(!!c)} />
                <Label htmlFor="rateOnRequest" className="text-sm font-normal cursor-pointer">Rate on request</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("role")} className="flex-1 h-11">Back</Button>
              <Button type="submit" className="flex-1 h-11 font-bold">Continue</Button>
            </div>
          </form>
        )}

        {step === "details" && role === "booker" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (validateDetails()) setStep("account");
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="bg-card border-border h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company or event type <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="company" value={companyOrEventType} onChange={(e) => setCompanyOrEventType(e.target.value)} className="bg-card border-border h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookerLocation">Location</Label>
              <Input id="bookerLocation" value={bookerLocation} onChange={(e) => setBookerLocation(e.target.value)} required className="bg-card border-border h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="bg-card border-border h-11" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("role")} className="flex-1 h-11">Back</Button>
              <Button type="submit" className="flex-1 h-11 font-bold">Continue</Button>
            </div>
          </form>
        )}

        {step === "account" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-card border-border h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-card border-border h-11" />
            </div>
            <div className="flex items-start gap-2 pt-1">
              <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(c) => setAcceptTerms(!!c)} className="mt-0.5" />
              <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-relaxed">
                I agree to the terms and conditions and confirm I'll receive a verification email.
              </Label>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("details")} className="flex-1 h-11" disabled={submitting}>Back</Button>
              <Button type="submit" disabled={submitting} className="flex-1 h-11 font-bold">
                {submitting ? "Creating..." : "Create account"}
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
