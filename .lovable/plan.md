

# jogbook — DJ Booking Platform

A dark-themed DJ booking platform where DJs manage their profile and receive booking requests from potential clients.

---

## 1. Authentication (Sign Up / Login)
- Email + password authentication for DJs
- Clean login and sign-up pages matching the dark theme with #00FF00 accents
- After login, DJs land on their Dashboard
- DJ profile is auto-created on sign-up

## 2. DJ Dashboard (Private)
- Overview of recent booking requests with status indicators (new, accepted, declined)
- Quick stats: total requests, pending requests, upcoming gigs
- Ability to accept or decline booking requests
- Sidebar navigation with the jogbook branding and links to Dashboard, My Profile, Requests, and Subscribe

## 3. DJ Profile Editor (Private)
- Edit profile info: name, bio, photo URL, genres, location
- Add past events with name and date
- Add music/mix links (SoundCloud, Mixcloud, Spotify, etc.)
- Add social media links
- Live preview link to share the public profile

## 4. Public DJ Profile Page
- Accessible without login at `/dj/:slug`
- Showcases: DJ name, photo, bio, genres, location
- Past events section
- Music samples/links section
- Social media links
- Embedded **Booking Request Form** at the bottom

## 5. Booking Request Form (Public)
- Fields: name, email, phone, event date, event type (wedding, corporate, club, festival, private party, other), and message
- Form validation with clear error states
- Success confirmation after submission
- Data saves to the database, linked to the DJ's profile

## 6. Booking Requests Page (Private)
- List view of all incoming booking requests
- Filter by status (all, new, accepted, declined)
- View request details and respond (accept/decline)
- Contact info visible for accepted bookings

## 7. Subscribe Page (Private)
- Placeholder pricing/subscription page with tiered plan cards
- Static content for now — no payment processing yet

## Design System
- **Background:** Black (#000) / near-black (#0a0a0a)
- **Accent:** #00FF00 (neon green)
- **Border radius:** 12px
- **Font:** Clean sans-serif, bold headings with tight tracking
- **Selection color:** Green text on black
- **Fully responsive** with mobile hamburger menu

## Backend (Lovable Cloud / Supabase)
- **profiles** table: DJ profile data (name, bio, photo, genres, location, slug, social links, music links, past events)
- **booking_requests** table: form submissions linked to DJ profiles
- Row-Level Security so DJs only see their own data
- Public read access for DJ profiles (for the public page)
- Public insert access for booking requests (so anyone can submit)

