-- ============================================================================
-- FOODTECH SAAS — ESQUEMA SQL MULTI-TENANT
-- ============================================================================
-- Base de datos: PostgreSQL (Supabase)
-- Estrategia Multi-Tenancy: Shared Schema + RLS por restaurant_id
-- Ejecutar este archivo completo en el SQL Editor de Supabase
-- ============================================================================

-- ============================================================================
-- EXTENSIONES Y LIMPIEZA INICIAL
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.modifiers CASCADE;
DROP TABLE IF EXISTS public.modifier_groups CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.tables CASCADE;
DROP TABLE IF EXISTS public.restaurant_members CASCADE;
DROP TABLE IF EXISTS public.restaurants CASCADE;

-- ============================================================================
-- TABLA: restaurants (Tenant Principal)
-- ============================================================================
CREATE TABLE public.restaurants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug                TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    logo_url            TEXT,
    brand_color_primary TEXT NOT NULL DEFAULT '#FF6B00',
    brand_color_secondary TEXT DEFAULT '#1A1A2E',
    currency            TEXT NOT NULL DEFAULT 'USD',
    timezone            TEXT NOT NULL DEFAULT 'America/New_York',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    tax_id              TEXT,
    phone               TEXT,
    address             TEXT,
    license_code        TEXT,
    license_valid_until TIMESTAMPTZ,
    upsell_item_1_id    UUID,
    upsell_item_2_id    UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  
    CONSTRAINT restaurants_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
  );

CREATE UNIQUE INDEX idx_restaurants_slug ON public.restaurants (slug);

COMMENT ON TABLE public.restaurants IS 'Tenant principal. Cada restaurante es un tenant aislado.';

-- ============================================================================
-- TABLA: restaurant_members (Vincula usuarios Auth al tenant)
-- ============================================================================
CREATE TABLE public.restaurant_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'kitchen', 'cashier', 'staff')),
  display_name    TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_member_per_restaurant UNIQUE (restaurant_id, user_id)
);

CREATE INDEX idx_members_restaurant ON public.restaurant_members (restaurant_id);
CREATE INDEX idx_members_user ON public.restaurant_members (user_id);

COMMENT ON TABLE public.restaurant_members IS 'Empleados vinculados a un restaurante con roles específicos.';

-- ============================================================================
-- TABLA: tables (Mesas del restaurante)
-- ============================================================================
CREATE TABLE public.tables (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number    INTEGER NOT NULL,
  label           TEXT,
  qr_url          TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_table_per_restaurant UNIQUE (restaurant_id, table_number)
);

CREATE INDEX idx_tables_restaurant ON public.tables (restaurant_id);

COMMENT ON TABLE public.tables IS 'Mesas físicas del restaurante. Cada una genera un QR único.';

-- ============================================================================
-- TABLA: categories (Categorías del menú)
-- ============================================================================
CREATE TABLE public.categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  icon            TEXT,
  order_index     INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_restaurant ON public.categories (restaurant_id);
CREATE INDEX idx_categories_order ON public.categories (restaurant_id, order_index);

COMMENT ON TABLE public.categories IS 'Categorías del menú (Hamburguesas, Bebidas, Postres, etc).';

-- ============================================================================
-- TABLA: products (Productos del menú)
-- ============================================================================
CREATE TABLE public.products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  base_price      NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
  image_url       TEXT,
  is_available    BOOLEAN NOT NULL DEFAULT true,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  order_index     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_restaurant ON public.products (restaurant_id);
CREATE INDEX idx_products_category ON public.products (category_id);
CREATE INDEX idx_products_available ON public.products (restaurant_id, is_available);

COMMENT ON TABLE public.products IS 'Productos del menú con precio, imagen y disponibilidad.';

-- ============================================================================
-- TABLA: modifier_groups (Grupos de modificadores)
-- ============================================================================
CREATE TABLE public.modifier_groups (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  is_required     BOOLEAN NOT NULL DEFAULT false,
  min_selections  INTEGER NOT NULL DEFAULT 0,
  max_selections  INTEGER NOT NULL DEFAULT 1,
  order_index     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_selections CHECK (min_selections >= 0 AND max_selections >= min_selections)
);

CREATE INDEX idx_modifier_groups_restaurant ON public.modifier_groups (restaurant_id);
CREATE INDEX idx_modifier_groups_product ON public.modifier_groups (product_id);

COMMENT ON TABLE public.modifier_groups IS 'Grupos de opciones (Tamaño, Extras, Salsas, etc).';

-- ============================================================================
-- TABLA: modifiers (Opciones individuales dentro de un grupo)
-- ============================================================================
CREATE TABLE public.modifiers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  extra_price     NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (extra_price >= 0),
  is_available    BOOLEAN NOT NULL DEFAULT true,
  order_index     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_modifiers_group ON public.modifiers (group_id);

COMMENT ON TABLE public.modifiers IS 'Opciones individuales (Queso Extra +$1.50, Sin Cebolla, etc).';

-- ============================================================================
-- TABLA: customers (Clientes registrados por restaurante)
-- ============================================================================
CREATE TABLE public.customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  visit_count     INTEGER NOT NULL DEFAULT 1,
  last_visit_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_customer_email_per_restaurant UNIQUE (restaurant_id, email)
);

CREATE INDEX idx_customers_restaurant ON public.customers (restaurant_id);
CREATE INDEX idx_customers_email ON public.customers (restaurant_id, email);

COMMENT ON TABLE public.customers IS 'Base de datos de clientes por restaurante. Email único por tenant.';

-- ============================================================================
-- TABLA: orders (Pedidos)
-- ============================================================================
CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id        UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  order_number    SERIAL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  payment_method  TEXT CHECK (payment_method IN ('stripe', 'cash', 'terminal', NULL)),
  payment_status  TEXT NOT NULL DEFAULT 'pending'
                    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_restaurant ON public.orders (restaurant_id);
CREATE INDEX idx_orders_status ON public.orders (restaurant_id, status);
CREATE INDEX idx_orders_customer ON public.orders (customer_id);
CREATE INDEX idx_orders_created ON public.orders (restaurant_id, created_at DESC);

COMMENT ON TABLE public.orders IS 'Pedidos con estado, total y método de pago vinculado al cliente.';

-- ============================================================================
-- TABLA: order_items (Líneas de pedido)
-- ============================================================================
CREATE TABLE public.order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name    TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  modifiers_snapshot JSONB DEFAULT '[]'::jsonb,
  subtotal        NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON public.order_items (order_id);

COMMENT ON TABLE public.order_items IS 'Líneas del pedido con snapshot de modificadores seleccionados.';
COMMENT ON COLUMN public.order_items.modifiers_snapshot IS 'Snapshot JSONB: [{group: "Extras", items: [{name: "Queso", price: 1.50}]}]';

-- ============================================================================
-- FUNCIÓN HELPER: Obtener restaurant_id del usuario autenticado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'restaurant_id')::UUID;
$$;

COMMENT ON FUNCTION public.get_user_restaurant_id IS 'Extrae restaurant_id del JWT del usuario autenticado.';

-- ============================================================================
-- FUNCIÓN HELPER: Verificar si un usuario es miembro de un restaurante
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_restaurant_member(p_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurant_members
    WHERE restaurant_id = p_restaurant_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

-- ============================================================================
-- FUNCIÓN: Auto-actualizar updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- POLÍTICAS RLS — MULTI-TENANT ISOLATION
-- ============================================================================

-- Habilitar RLS en TODAS las tablas
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- restaurants: Lectura pública (activos), escritura solo owner/manager
-- --------------------------------------------------------------------------
CREATE POLICY "Restaurantes activos visibles públicamente"
  ON public.restaurants FOR SELECT
  USING (is_active = true);

CREATE POLICY "Solo miembros pueden actualizar su restaurante"
  ON public.restaurants FOR UPDATE
  USING (public.is_restaurant_member(id))
  WITH CHECK (public.is_restaurant_member(id));

-- --------------------------------------------------------------------------
-- restaurant_members: Solo miembros del mismo restaurante
-- --------------------------------------------------------------------------
CREATE POLICY "Miembros ven solo su restaurante"
  ON public.restaurant_members FOR SELECT
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Solo owners pueden gestionar miembros"
  ON public.restaurant_members FOR ALL
  USING (
    restaurant_id = public.get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM public.restaurant_members
      WHERE user_id = auth.uid()
        AND restaurant_id = public.get_user_restaurant_id()
        AND role = 'owner'
    )
  );

-- DEMO: Permitir todo a todos (Normalmente solo miembros autenticados)
CREATE POLICY "Demo allow ALL on restaurants" ON public.restaurants FOR ALL USING (true);
CREATE POLICY "Demo allow ALL on restaurant_members" ON public.restaurant_members FOR ALL USING (true);
CREATE POLICY "Demo allow ALL on tables" ON public.tables FOR ALL USING (true);
CREATE POLICY "Demo allow ALL on categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Demo allow ALL on products" ON public.products FOR ALL USING (true);
CREATE POLICY "Demo allow ALL on modifier_groups" ON public.modifier_groups FOR ALL USING (true);
CREATE POLICY "Demo allow ALL on modifiers" ON public.modifiers FOR ALL USING (true);
CREATE POLICY "Demo allow ALL on customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Demo allow ALL on orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Demo allow ALL on order_items" ON public.order_items FOR ALL USING (true);

-- ============================================================================
-- HABILITAR REALTIME
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- ============================================================================
-- DATOS DE EJEMPLO (Restaurante Demo)
-- ============================================================================
INSERT INTO public.restaurants (id, slug, name, logo_url, brand_color_primary, brand_color_secondary, currency)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'burger-palace',
  'Burger Palace',
  NULL,
  '#FF6B00',
  '#1A1A2E',
  'USD'
);

-- Mesas de ejemplo (6 mesas configuradas)
INSERT INTO public.tables (restaurant_id, table_number, label) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1, 'Mesa 1'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2, 'Mesa 2'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 3, 'Mesa 3'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 4, 'Mesa 4'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 5, 'Mesa 5'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 6, 'Mesa 6');

-- Categorías de ejemplo
INSERT INTO public.categories (id, restaurant_id, name, icon, order_index) VALUES
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Especialidades', 'beef', 1),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bebidas', 'cup-soda', 2);

-- Productos de ejemplo (4 platos configurados)
INSERT INTO public.products (id, restaurant_id, category_id, name, description, base_price, is_featured) VALUES
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Burger Master', 'Doble carne angus, queso fundido, tocino crocante y salsa secreta', 12.99, true),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Chicken Crispy', 'Pechuga de pollo crujiente, ensalada de col y mayonesa picante', 9.50, false),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Papas Trufadas', 'Papas rústicas con aceite de trufa blanca y queso parmesano', 5.99, true),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Limonada Rosa', 'Refrescante limonada con infusión de frutos rojos', 3.50, false);

-- Grupos de Modificadores para la Burger Master
INSERT INTO public.modifier_groups (id, restaurant_id, product_id, name, is_required, min_selections, max_selections) VALUES
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Elige tu término', true, 1, 1),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Extras', false, 0, 3);

-- Modificadores
INSERT INTO public.modifiers (group_id, name, extra_price) VALUES
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Medio', 0.00),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Tres Cuartos', 0.00),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Bien Cocido', 0.00),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Extra Queso Cheddar', 1.50),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Tocino Adicional', 2.00),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Huevo Frito', 1.00);

-- ============================================================================
-- TABLA: waiter_calls (Llamados de mesero)
-- ============================================================================
CREATE TABLE public.waiter_calls (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id        UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_waiter_calls_restaurant ON public.waiter_calls (restaurant_id);
CREATE INDEX idx_waiter_calls_status ON public.waiter_calls (status);

ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for everyone" ON public.waiter_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for everyone" ON public.waiter_calls FOR SELECT USING (true);
CREATE POLICY "Enable update for everyone" ON public.waiter_calls FOR UPDATE USING (true);

-- ============================================================================
-- TABLA: leads (Solicitudes de prueba gratuita desde la Landing Page)
-- ============================================================================
CREATE TABLE public.leads (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_name   TEXT NOT NULL,
    contact_name      TEXT NOT NULL,
    email             TEXT NOT NULL,
    phone             TEXT,
    business_type     TEXT CHECK (business_type IN ('fast_food', 'casual_dining', 'other')),
    status            TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'onboarded', 'discarded')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_status ON public.leads (status);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for everyone" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Demo allow ALL on leads" ON public.leads FOR ALL USING (true);

COMMENT ON TABLE public.leads IS 'Solicitudes de prueba gratuita (Marketing). El Super-Admin las convierte en tenants reales desde /admin.';

-- ============================================================================
-- FIN DEL ESQUEMA
-- ============================================================================
