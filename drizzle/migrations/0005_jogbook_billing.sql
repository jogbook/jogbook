ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS billing_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE public.billing_products (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('one_time','subscription')),
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  purchasable boolean NOT NULL DEFAULT false,
  paypal_plan_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billing_products TO anon, authenticated;
GRANT ALL ON public.billing_products TO service_role;
ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are public" ON public.billing_products FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.billing_products (code, name, description, kind, price, purchasable) VALUES
 ('DJ_CONCIERGE','DJ Concierge Setup','Founder-assisted profile, booking link and onboarding optimisation. Manual service.','one_time',49,true),
 ('PROMOTER_PILOT','Promoter Pilot','Up to 3 curated DJ shortlists per billing period plus manual inquiry coordination.','subscription',199,false),
 ('DJ_PRO','DJ Pro','Booking analytics, inquiry exports and notification options. Coming soon.','subscription',19,false);

CREATE TABLE public.billing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_code text NOT NULL REFERENCES public.billing_products(code),
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','FAILED','CANCELLED','REFUNDED')),
  paypal_order_id text UNIQUE,
  paypal_capture_id text UNIQUE,
  failure_reason text,
  refund_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billing_orders TO authenticated;
GRANT ALL ON public.billing_orders TO service_role;
ALTER TABLE public.billing_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.billing_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all orders" ON public.billing_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER billing_orders_updated_at BEFORE UPDATE ON public.billing_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid UNIQUE REFERENCES public.billing_orders(id),
  product_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','refunded')),
  details text NOT NULL DEFAULT '',
  admin_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own service requests" ON public.service_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all service requests" ON public.service_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.billing_orders(id),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_requests TO authenticated;
GRANT ALL ON public.support_requests TO service_role;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own support requests" ON public.support_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'open');
CREATE POLICY "Users view own support requests" ON public.support_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all support requests" ON public.support_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.billing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billing_audit TO authenticated;
GRANT ALL ON public.billing_audit TO service_role;
ALTER TABLE public.billing_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit" ON public.billing_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));