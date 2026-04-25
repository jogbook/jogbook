import { useState, useEffect } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Disc3, CalendarHeart } from "lucide-react";
import jogbookLogo from "@/assets/jogbook-logo.png";

type Role = "dj" | "booker";
type Step = "role" | "details" | "account";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Côte d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa",
  "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan",
  "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen",
  "Zambia", "Zimbabwe"
];

export default function Signup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Shared name fields (both DJs and Bookers)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // DJ fields
  const [stageName, setStageName] = useState("");
  const [genres, setGenres] = useState("");
  const [djCity, setDjCity] = useState("");
  const [djCountry, setDjCountry] = useState("");
  const [bio, setBio] = useState("");
  const [soundcloud, setSoundcloud] = useState("");
  const [instagram, setInstagram] = useState("");
  const [mixSets, setMixSets] = useState("");
  const [rate, setRate] = useState("");
  const [rateOnRequest, setRateOnRequest] = useState(false);

  // Booker fields
  const [companyOrEventType, setCompanyOrEventType] = useState("");
  const [bookerCity, setBookerCity] = useState("");
  const [bookerCountry, setBookerCountry] = useState("");
  const [phone, setPhone] = useState("");

  // Profile photo with preview
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Cleanup preview URL on unmount or change
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

  const handlePhotoChange = (file: File | null) => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large. Maximum size is 25MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
        return;
      }
      setProfilePhoto(file);
      setPhotoPreviewUrl(URL.createObjectURL(file));
    } else {
      setProfilePhoto(null);
      setPhotoPreviewUrl(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleRoleSelect = (r: Role) => {
    setRole(r);
    setStep("details");
  };

  const validateDetails = (): boolean => {
    if (!firstName.trim()) return toast.error("First name is required"), false;
    if (!lastName.trim()) return toast.error("Last name is required"), false;
    if (role === "dj") {
      if (!stageName.trim()) return toast.error("Stage name is required"), false;
      if (!genres.trim()) return toast.error("At least one genre is required"), false;
      if (!djCity.trim()) return toast.error("City is required"), false;
      if (!djCountry.trim()) return toast.error("Country is required"), false;
      if (!bio.trim()) return toast.error("Bio is required"), false;
    } else {
      if (!bookerCity.trim()) return toast.error("City is required"), false;
      if (!bookerCountry.trim()) return toast.error("Country is required"), false;
      if (!phone.trim()) return toast.error("Phone number is required"), false;
    }
    return true;
  };

  const uploadProfilePhoto = async (userId: string): Promise<string | null> => {
    if (!profilePhoto) return null;
    const fileExt = profilePhoto.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, profilePhoto);
    if (uploadError) {
      console.error("Photo upload error:", uploadError);
      toast.error("Profile photo could not be uploaded, you can add it later.");
      return null;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return urlData.publicUrl;
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
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);

    const displayName = role === "dj" ? stageName : `${firstName} ${lastName}`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          role,
          name: displayName,
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      let avatarUrl = null;
      if (profilePhoto) {
        avatarUrl = await uploadProfilePhoto(userId);
      }

      let locationStr = "";
      if (role === "dj") {
        locationStr = `${djCity}, ${djCountry}`;
      } else {
        locationStr = `${bookerCity}, ${bookerCountry}`;
      }

      try {
        if (role === "dj") {
          const genreList = genres.split(",").map((g) => g.trim()).filter(Boolean);
          const social = instagram.trim() ? [{ label: "Instagram", url: instagram.trim() }] : [];
          const music = [];
          if (soundcloud.trim()) music.push({ label: "SoundCloud", url: soundcloud.trim() });
          if (mixSets.trim()) {
            mixSets.split(/\n|,/).map(u => u.trim()).filter(Boolean).forEach((url, i) => {
              music.push({ label: `Mix ${i + 1}`, url });
            });
          }

          await supabase
            .from("profiles")
            .update({
              name: stageName,
              bio,
              location: locationStr,
              genres: genreList,
              social_links: social,
              music_links: music,
              rate: rateOnRequest ? null : rate,
              rate_on_request: rateOnRequest,
              avatar_url: avatarUrl,
            })
            .eq("user_id", userId);
        } else {
          await supabase
            .from("profiles")
            .update({
              name: `${firstName} ${lastName}`,
              location: locationStr,
              phone,
              company: companyOrEventType || null,
              avatar_url: avatarUrl,
            })
            .eq("user_id", userId);
        }
      } catch (err) {
        console.error(err);
        toast.error("Profile could not be saved, but your account was created.");
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="bg-card border-border h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="bg-card border-border h-11" />
              </div>
            </div>
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
              <Label>Location</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="City"
                  value={djCity}
                  onChange={(e) => setDjCity(e.target.value)}
                  required
                  className="bg-card border-border h-11"
                />
                <select
                  value={djCountry}
                  onChange={(e) => setDjCountry(e.target.value)}
                  required
                  className="bg-card border-border rounded-md px-3 h-11 text-sm"
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Profile photo with preview */}
            <div className="space-y-2">
              <Label htmlFor="profilePhoto">Profile photo <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="profilePhoto"
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                className="bg-card border-border h-11"
              />
              {photoPreviewUrl && (
                <div className="mt-2 flex justify-center">
                  <img
                    src={photoPreviewUrl}
                    alt="Profile preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">Max 25MB (high-res press photos supported). You can also add one later from your dashboard.</p>
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="bg-card border-border h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="bg-card border-border h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company or event type <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="company" value={companyOrEventType} onChange={(e) => setCompanyOrEventType(e.target.value)} className="bg-card border-border h-11" />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="City"
                  value={bookerCity}
                  onChange={(e) => setBookerCity(e.target.value)}
                  required
                  className="bg-card border-border h-11"
                />
                <select
                  value={bookerCountry}
                  onChange={(e) => setBookerCountry(e.target.value)}
                  required
                  className="bg-card border-border rounded-md px-3 h-11 text-sm"
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Profile photo with preview for booker */}
            <div className="space-y-2">
              <Label htmlFor="profilePhoto">Profile photo <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="profilePhoto"
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                className="bg-card border-border h-11"
              />
              {photoPreviewUrl && (
                <div className="mt-2 flex justify-center">
                  <img
                    src={photoPreviewUrl}
                    alt="Profile preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                  />
                </div>
              )}
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required className="bg-card border-border h-11" />
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