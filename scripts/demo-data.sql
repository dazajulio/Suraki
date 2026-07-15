-- Ejecuta este script en el SQL Editor de Supabase para actualizar los datos

-- 1. Crear tabla waiter_calls si no existe (por precaución)
CREATE TABLE IF NOT EXISTS public.waiter_calls (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id        UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_waiter_calls_restaurant ON public.waiter_calls (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_status ON public.waiter_calls (status);

ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;

-- Evitar errores si las políticas ya existen
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waiter_calls' AND policyname = 'Enable insert for everyone') THEN
    CREATE POLICY "Enable insert for everyone" ON public.waiter_calls FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waiter_calls' AND policyname = 'Enable select for everyone') THEN
    CREATE POLICY "Enable select for everyone" ON public.waiter_calls FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waiter_calls' AND policyname = 'Enable update for everyone') THEN
    CREATE POLICY "Enable update for everyone" ON public.waiter_calls FOR UPDATE USING (true);
  END IF;
END $$;


-- 2. Añadir nuevas columnas a restaurants si no existen
ALTER TABLE public.restaurants 
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS license_code TEXT,
  ADD COLUMN IF NOT EXISTS license_valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upsell_item_1_id UUID REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS upsell_item_2_id UUID REFERENCES public.products(id);


-- 3. Actualizar los datos del restaurante principal con la info de Burger Grill
UPDATE public.restaurants 
SET 
  name = 'Burger Grill',
  logo_url = '/logo.svg',
  tax_id = 'J-40401442-9',
  phone = '+584148817137',
  address = '708 Thompson Street NY 07050',
  license_code = 'K895221154848FJKR6955874',
  license_valid_until = '2026-12-31'
WHERE is_active = true;
