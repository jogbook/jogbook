# JogBook Low-Cost Launch Plan

Goal: launch now with booking requests and profiles. Payments stay switched off, and all the payment code stays in place so it can be turned on later. No design changes.

## 1. What's ready to launch (no changes needed)
- DJ and booker signup/login, picking a role, and the dashboards for each
- Public DJ profile at `/dj/:slug`: banner, photo, genres, Spotify/SoundCloud, social links, press kit, copy link
- Booking request form, plus the DJ's list of requests (accept, decline, delete)
- Profile editor, image uploads and press kit uploads

## 2. Payments master switch (setting only, no new feature)
Add to the existing `platform_settings` row:
- `payments_enabled` (boolean, default **false**)
- `payouts_enabled` (boolean, default **false**)
- `crypto_payouts_enabled` (boolean, default **false**)
- `enabled_providers` (text[], default `{}`), allowed values: `STRIPE`, `PAYPAL`, `CRYPTO`

A provider counts as available only if it is listed **and** its credentials exist on the server (for example `STRIPE_SECRET_KEY` or `PAYPAL_CLIENT_ID`/`SECRET`). Only admins (service role) can change this. Signed-in users can only read it.

## 3. Server-side enforcement (the real protection)
- `checkout` function: return 403 "Payments not available" unless `payments_enabled` is on and the chosen method's provider is available.
- `payouts` function: block withdraw, onboarding and set-method actions unless `payouts_enabled` is on. Crypto method actions are also blocked unless `crypto_payouts_enabled` is on.
- `bookings` function: the payment-terms actions that start a charge get the same check. Status changes (accept, decline, delete) keep working.
- `payments-webhook`: unchanged. It still verifies signatures and records events.

## 4. Frontend: hide, don't redesign
- `src/lib/payments.ts`: add `getPaymentAvailability()`, which reads the new flags.
- `BookingPaymentPanel`, `Checkout`, `Payouts` and `Earnings`: when payments are off, show one small existing-style notice ("Payments through JogBook are coming soon — arrange payment directly with the DJ") in place of the pay/withdraw buttons.
- `Payouts`: hide the crypto (USDT/USDC/SOL/ETH) options while `crypto_payouts_enabled` is off.
- The booking request flow stays fully usable with no payment step.

## 5. Commission preserved
- `platform_settings.commission_rate` (5%) and the ledger math stay as they are. Nothing is removed. They only take effect once payments are enabled.

## 6. PayPal activation: what's needed (investigation only)
- Secrets: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENV=live`
- Register the `payments-webhook` URL in the PayPal dashboard for order and capture events
- PayPal Payouts needs separate approval from PayPal (a business account; South Africa has restrictions on receiving payouts)
- Then set `enabled_providers = {PAYPAL}`, `payments_enabled = true`, and later `payouts_enabled`
- I'll confirm the exact adapter gaps and include them in the checklist

## 7. Security review
- Run the security scan and database linter
- Check row-level security on `profiles`, `booking_requests`, `booker_profiles`, `user_roles`, `payments`, `payouts`, `payout_accounts` and `platform_settings`
- Booking privacy: only the DJ and the booker on a request can see it. Anonymous visitors can submit a request but can't read any. Public profiles don't expose emails, phone numbers or payout data.
- Storage buckets: public read only where it's intended (images, press kits). Writes limited to each owner's folder.
- Fix only real security holes I find. Anything else goes on the checklist.

## 8. Deliverable
`PRODUCTION_READINESS.md` (in the project) listing:
- what's ready, and blockers sorted by severity (security, auth email/SMTP and Site URL, domain, legal pages such as terms and privacy, payments off)
- steps to activate PayPal and Stripe later

## Technical notes
- One migration that adds the columns with safe defaults. Existing tables and data are untouched.
- The edge function check goes in `_shared/db.ts` (`assertProviderAvailable`) so every function uses the same rule.
- The edge functions are redeployed afterward. Types regenerate automatically.
