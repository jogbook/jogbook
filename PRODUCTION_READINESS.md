# JogBook — Production Readiness (low-cost launch)

## Launch mode
Payments and payouts are **switched off** via `platform_settings`:
`payments_enabled=false`, `payouts_enabled=false`, `crypto_payouts_enabled=false`, `enabled_providers={}`.
Enforced server-side in `checkout` and `payouts` functions (403), UI hides pay/withdraw actions.
All payment, ledger, payout and 5% commission code is preserved (`commission_percent` untouched).

## Ready for launch
- Signup/login with DJ / Booker roles (roles in separate `user_roles` table)
- Public DJ profiles `/dj/:slug`, media, press kit, social/music links, share link
- Booking request form (anonymous allowed), DJ request management (accept/decline/delete)
- DJs can still record agreed fee/deposit terms on a booking (informational while payments are off)

## Security review
- RLS enabled on all tables; payments/payouts/payout_accounts/webhook_events are write-locked to the server
- Booking privacy: only the owning DJ can read/update/delete requests; anonymous users can insert only
- Profiles are publicly readable (intended); they hold no email/phone/payout data
- Storage buckets public-read; writes scoped to owner folder
- Webhook signatures verified (Stripe, PayPal)

## Launch report (7 Oct 2026)
| Status | Item |
|---|---|
| PASS | Leaked-password protection enabled |
| PASS | Terms (/terms) & Privacy (/privacy) pages, linked in signup, login and public profile footer |
| PASS | Booking spam protection: honeypot + time trap (client), server trigger validates input, blocks link spam, rate-limits (3/email/DJ/hour, 10/email/day, 30/DJ/hour), forces clean status/payment fields |
| PASS | Bookers see their submitted requests + status (signed-in submissions; linked server-side, cannot be spoofed) |
| PASS | Payments/payouts/crypto disabled by switch + server enforcement; architecture unchanged |
| PASS | Anonymous users cannot read booking requests (verified) |
| PASS | Fixed: avatar storage rule let any signed-in user change any file — now owner-folder only |
| ACCEPTED | platform_settings readable by signed-in users (non-sensitive config) ; profiles publicly readable (by design) ; public buckets listable (public content) |
| BLOCKER | Production email for jogbook.com — needs sender domain setup (Cloud → Emails) and DNS records at your registrar |
| BLOCKER | jogbook.com as site URL — connect the custom domain to the published app first; auth redirect URLs then follow it |
| NOTE | Legal pages are a starting template — have them reviewed (POPIA/GDPR) |
| NOTE | Requests sent before today, or while signed out, are not linked to booker accounts |

## Activating PayPal later (minimum steps)
1. PayPal Business account (check SA restrictions on receiving funds; payouts need PayPal Payouts approval)
2. Add secrets: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MODE=live` (`PAYPAL_PARTNER_ID` only for marketplace onboarding)
3. Register the `payments-webhook` URL in PayPal for order/capture events
4. Set `enabled_providers={PAYPAL}`, `payments_enabled=true`; later `PAYOUT_PROVIDER=paypal` and `payouts_enabled=true`
Gaps: refunds/disputes are recorded but not fully reversed in the ledger; test end-to-end in PayPal sandbox first.

## Activating Stripe later
Add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, register webhook, set `enabled_providers` to include `STRIPE`, enable flags. Stripe Connect payouts require your own Stripe platform account in a supported country.

## Crypto
Checkout verification exists; crypto **payouts are not automated** — keep `crypto_payouts_enabled=false`.
