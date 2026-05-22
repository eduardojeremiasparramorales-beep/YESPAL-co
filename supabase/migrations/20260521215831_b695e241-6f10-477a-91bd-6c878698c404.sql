
CREATE OR REPLACE FUNCTION public.mark_picked_up(_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _r public.orders;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  UPDATE public.orders SET status='picked_up', picked_up_at=now()
  WHERE id=_order_id AND courier_id=_uid AND status='accepted'
  RETURNING * INTO _r;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'No se pudo marcar como recogido'; END IF;
  INSERT INTO public.order_events(order_id, actor_id, event_type) VALUES(_order_id, _uid, 'picked_up');
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.complete_order(_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _r public.orders;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  UPDATE public.orders SET status='delivered', delivered_at=now()
  WHERE id=_order_id AND courier_id=_uid AND status IN ('accepted','picked_up')
  RETURNING * INTO _r;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'No se pudo completar la orden'; END IF;

  INSERT INTO public.order_events(order_id, actor_id, event_type, payload)
  VALUES (_order_id, _uid, 'delivered', jsonb_build_object('fare', _r.fare_cop));

  INSERT INTO public.courier_ledger(courier_id, order_id, type, amount_cop, notes)
  VALUES (_uid, _order_id, 'earning', _r.courier_earnings_cop, 'Ganancia por entrega');

  IF _r.payment_method = 'cash' THEN
    INSERT INTO public.courier_ledger(courier_id, order_id, type, amount_cop, notes)
    VALUES (_uid, _order_id, 'fee_owed', _r.platform_fee_cop, 'Comisión por cobro en efectivo');
    UPDATE public.couriers SET balance_owed_cop = balance_owed_cop + _r.platform_fee_cop
    WHERE user_id = _uid;
  END IF;

  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.settle_courier_balance(_courier_id uuid, _amount integer, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Solo admin'; END IF;
  INSERT INTO public.courier_ledger(courier_id, type, amount_cop, notes)
  VALUES (_courier_id, 'payout', _amount, COALESCE(_notes, 'Pago recibido'));
  UPDATE public.couriers SET balance_owed_cop = GREATEST(0, balance_owed_cop - _amount)
  WHERE user_id = _courier_id;
END; $$;

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.couriers REPLICA IDENTITY FULL;
