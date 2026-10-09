
- JogBook-owned product sales (Concierge, subscriptions) go through the `billing` edge function and `billing_*` tables, gated by `platform_settings.billing_enabled` — kept separate from DJ booking payments/payouts so selling services never enables marketplace money flows.
- Paid status for billing orders is set only after server-side PayPal order/capture verification (amount + currency match); redirects never mark orders paid.
