
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('customer', 'courier', 'admin');
CREATE TYPE public.order_status AS ENUM ('pending', 'accepted', 'picked_up', 'delivered', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'nequi');
CREATE TYPE public.courier_status AS ENUM ('pending_approval', 'approved', 'suspended');
CREATE TYPE public.ledger_type AS ENUM ('cash_collected', 'platform_fee_owed', 'payout');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL DEFAULT 'Bucaramanga',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- USER ROLES (separated for security)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================================
-- COURIERS (extra data only for repartidores)
-- =========================================================
CREATE TABLE public.couriers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  license_plate TEXT NOT NULL,
  document_id TEXT,
  document_url TEXT,
  status public.courier_status NOT NULL DEFAULT 'pending_approval',
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  last_seen TIMESTAMPTZ,
  balance_owed_cop INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- ORDERS
-- =========================================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  city TEXT NOT NULL DEFAULT 'Bucaramanga',
  status public.order_status NOT NULL DEFAULT 'pending',

  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,

  dropoff_address TEXT NOT NULL,
  dropoff_lat DOUBLE PRECISION NOT NULL,
  dropoff_lng DOUBLE PRECISION NOT NULL,

  description TEXT,
  recipient_name TEXT,
  recipient_phone TEXT,

  distance_km NUMERIC(6,2) NOT NULL DEFAULT 0,
  fare_cop INTEGER NOT NULL,
  courier_earnings_cop INTEGER NOT NULL,
  platform_fee_cop INTEGER NOT NULL,

  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  payment_confirmed BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_status_city ON public.orders (status, city) WHERE status = 'pending';
CREATE INDEX idx_orders_courier ON public.orders (courier_id, status);
CREATE INDEX idx_orders_customer ON public.orders (customer_id, created_at DESC);

-- =========================================================
-- ORDER EVENTS (audit log)
-- =========================================================
CREATE TABLE public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- COURIER LEDGER (cash tracking)
-- =========================================================
CREATE TABLE public.courier_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  type public.ledger_type NOT NULL,
  amount_cop INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_courier ON public.courier_ledger (courier_id, created_at DESC);

-- =========================================================
-- ATOMIC ACCEPT ORDER FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION public.accept_order(_order_id UUID)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _courier_uid UUID := auth.uid();
  _result public.orders;
  _approved BOOLEAN;
BEGIN
  IF _courier_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Verify courier is approved
  SELECT (status = 'approved') INTO _approved
  FROM public.couriers WHERE user_id = _courier_uid;

  IF _approved IS NOT TRUE THEN
    RAISE EXCEPTION 'Repartidor no aprobado';
  END IF;

  -- Atomic claim: only succeeds if order is still pending and unassigned
  UPDATE public.orders
  SET courier_id = _courier_uid,
      status = 'accepted',
      accepted_at = now()
  WHERE id = _order_id
    AND status = 'pending'
    AND courier_id IS NULL
  RETURNING * INTO _result;

  IF _result.id IS NULL THEN
    RAISE EXCEPTION 'La orden ya fue tomada o no existe';
  END IF;

  INSERT INTO public.order_events (order_id, actor_id, event_type, payload)
  VALUES (_order_id, _courier_uid, 'accepted', jsonb_build_object('courier_id', _courier_uid));

  RETURN _result;
END;
$$;

-- =========================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuario'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'city', 'Bucaramanga')
  );

  -- Default role is customer; courier/admin assigned later
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'customer'));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER couriers_updated_at BEFORE UPDATE ON public.couriers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_ledger ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- user_roles (read own, admin all)
CREATE POLICY "roles_select_own_or_admin" ON public.user_roles FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- couriers
CREATE POLICY "couriers_select_self_or_admin_or_active_order" ON public.couriers FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.courier_id = couriers.user_id
      AND o.customer_id = auth.uid()
      AND o.status IN ('accepted','picked_up')
  )
);
CREATE POLICY "couriers_insert_self" ON public.couriers FOR INSERT
WITH CHECK (user_id = auth.uid());
CREATE POLICY "couriers_update_self" ON public.couriers FOR UPDATE
USING (user_id = auth.uid());
CREATE POLICY "couriers_admin_update" ON public.couriers FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- orders
CREATE POLICY "orders_customer_select_own" ON public.orders FOR SELECT
USING (customer_id = auth.uid());
CREATE POLICY "orders_courier_select_assigned_or_pending" ON public.orders FOR SELECT
USING (
  (courier_id = auth.uid())
  OR (status = 'pending' AND public.has_role(auth.uid(), 'courier'))
);
CREATE POLICY "orders_admin_select_all" ON public.orders FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "orders_customer_insert" ON public.orders FOR INSERT
WITH CHECK (customer_id = auth.uid() AND public.has_role(auth.uid(), 'customer'));

CREATE POLICY "orders_courier_update_assigned" ON public.orders FOR UPDATE
USING (courier_id = auth.uid());
CREATE POLICY "orders_customer_cancel" ON public.orders FOR UPDATE
USING (customer_id = auth.uid() AND status = 'pending');
CREATE POLICY "orders_admin_update" ON public.orders FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- order_events
CREATE POLICY "events_select_related" ON public.order_events FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_events.order_id
      AND (o.customer_id = auth.uid() OR o.courier_id = auth.uid())
  )
);
CREATE POLICY "events_insert_actor" ON public.order_events FOR INSERT
WITH CHECK (actor_id = auth.uid());

-- courier_ledger
CREATE POLICY "ledger_select_self_or_admin" ON public.courier_ledger FOR SELECT
USING (courier_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ledger_admin_manage" ON public.courier_ledger FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- REALTIME
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.couriers;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.couriers REPLICA IDENTITY FULL;
