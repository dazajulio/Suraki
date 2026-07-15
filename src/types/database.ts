// ============================================================================
// TIPOS DE BASE DE DATOS — SUPABASE MULTI-TENANT
// ============================================================================
// Estos tipos reflejan el esquema SQL. En producción, se generan con:
// npx supabase gen types typescript --project-id <id> > src/types/database.ts
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          brand_color_primary: string;
          brand_color_secondary: string | null;
          currency: string;
          timezone: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['restaurants']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['restaurants']['Insert']>;
      };
      restaurant_members: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string;
          role: 'owner' | 'manager' | 'kitchen' | 'cashier' | 'staff';
          display_name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['restaurant_members']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['restaurant_members']['Insert']>;
      };
      tables: {
        Row: {
          id: string;
          restaurant_id: string;
          table_number: number;
          label: string | null;
          qr_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tables']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tables']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          icon: string | null;
          order_index: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description: string | null;
          base_price: number;
          image_url: string | null;
          is_available: boolean;
          is_featured: boolean;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      modifier_groups: {
        Row: {
          id: string;
          restaurant_id: string;
          product_id: string | null;
          name: string;
          is_required: boolean;
          min_selections: number;
          max_selections: number;
          order_index: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['modifier_groups']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['modifier_groups']['Insert']>;
      };
      modifiers: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          extra_price: number;
          is_available: boolean;
          order_index: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['modifiers']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['modifiers']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          email: string;
          phone: string | null;
          visit_count: number;
          last_visit_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'visit_count' | 'last_visit_at' | 'created_at'> & {
          id?: string;
          visit_count?: number;
          last_visit_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string | null;
          customer_id: string | null;
          order_number: number;
          status: OrderStatus;
          total_amount: number;
          payment_method: PaymentMethod | null;
          payment_status: PaymentStatus;
          stripe_payment_intent_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'order_number' | 'created_at' | 'updated_at'> & {
          id?: string;
          order_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          modifiers_snapshot: ModifierSnapshot[];
          subtotal: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      leads: {
        Row: {
          id: string;
          restaurant_name: string;
          contact_name: string;
          email: string;
          phone: string | null;
          business_type: 'fast_food' | 'casual_dining' | 'other' | null;
          status: 'new' | 'contacted' | 'onboarded' | 'discarded';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'status' | 'created_at'> & {
          id?: string;
          status?: 'new' | 'contacted' | 'onboarded' | 'discarded';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
      };
    };
  };
}

// ============================================================================
// TIPOS DE DOMINIO
// ============================================================================

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentMethod = 'stripe' | 'cash' | 'terminal';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type MemberRole = 'owner' | 'manager' | 'kitchen' | 'cashier' | 'staff';

export interface ModifierSnapshot {
  group: string;
  items: {
    name: string;
    price: number;
  }[];
}

// ============================================================================
// TIPOS DERIVADOS (Shortcuts)
// ============================================================================

export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type RestaurantMember = Database['public']['Tables']['restaurant_members']['Row'];
export type Table = Database['public']['Tables']['tables']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type ModifierGroup = Database['public']['Tables']['modifier_groups']['Row'];
export type Modifier = Database['public']['Tables']['modifiers']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];

// ============================================================================
// TIPOS EXTENDIDOS (Con relaciones)
// ============================================================================

export interface ProductWithModifiers extends Product {
  modifier_groups: (ModifierGroup & {
    modifiers: Modifier[];
  })[];
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  table: Table | null;
  customer: Customer | null;
}

export interface CategoryWithProducts extends Category {
  products: Product[];
}

// ============================================================================
// TIPOS DEL CARRITO (Zustand Store)
// ============================================================================

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedModifiers: ModifierSnapshot[];
  unitPrice: number;
  subtotal: number;
}

export interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  tableId: string | null;
  addItem: (item: Omit<CartItem, 'id' | 'subtotal'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setContext: (restaurantId: string, tableId: string) => void;
  getTotal: () => number;
  getItemCount: () => number;
}

// ============================================================================
// TIPOS I18N
// ============================================================================

export type SupportedLocale = 'es' | 'en' | 'pt' | 'fr';

export interface TranslationStrings {
  menu: string;
  cart: string;
  checkout: string;
  addToCart: string;
  viewCart: string;
  placeOrder: string;
  payWithCard: string;
  payAtCounter: string;
  orderPlaced: string;
  name: string;
  email: string;
  phone: string;
  optional: string;
  required: string;
  total: string;
  subtotal: string;
  quantity: string;
  remove: string;
  emptyCart: string;
  continueShopping: string;
  affiliatePrompt: string;
  upsellTitle: string;
  upsellSkip: string;
  upsellAdd: string;
}
