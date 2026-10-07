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

## Blockers / to do before launch
| Severity | Item |
|---|---|
| High | Turn on leaked-password protection (auth setting) |
| High | Configure custom email sender (SMTP) + Site URL / redirect URLs for jogbook.com, otherwise signup emails use default limits |
| High | Terms of Service & Privacy Policy pages (collects client names, emails, phones) |
| Medium | Bookers cannot see the requests they submitted in-app (no read policy on `client_user_id`) — acceptable for launch, they get the access-token link |
| Medium | Anonymous booking inserts have no rate limit / captcha — spam risk |
| Low | Security-definer helper functions are callable by API users (read-only, low risk) |
| Low | Custom domain connection |

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
