// ============================================================================
// INTERNACIONALIZACIÓN — Detección automática de idioma
// ============================================================================
// Detecta navigator.language y ajusta las etiquetas base del kiosko.
// Soporta: Español (es), English (en), Português (pt), Français (fr)
// ============================================================================

import type { SupportedLocale, TranslationStrings } from '@/types/database';

const translations: Record<SupportedLocale, TranslationStrings> = {
  es: {
    menu: 'Menú',
    cart: 'Carrito',
    checkout: 'Finalizar Pedido',
    addToCart: 'Agregar al Carrito',
    viewCart: 'Ver Carrito',
    placeOrder: 'Realizar Pedido',
    payWithCard: 'Pagar con Tarjeta',
    payAtCounter: 'Pagar en Caja',
    orderPlaced: '¡Pedido Realizado!',
    name: 'Nombre',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    optional: 'Opcional',
    required: 'Requerido',
    total: 'Total',
    subtotal: 'Subtotal',
    quantity: 'Cantidad',
    remove: 'Eliminar',
    emptyCart: 'Tu carrito está vacío',
    continueShopping: 'Seguir viendo el menú',
    affiliatePrompt: 'Afíliate para recibir ofertas exclusivas',
    upsellTitle: '¿Deseas agregar algo más?',
    upsellSkip: 'No, gracias',
    upsellAdd: 'Agregar',
  },
  en: {
    menu: 'Menu',
    cart: 'Cart',
    checkout: 'Checkout',
    addToCart: 'Add to Cart',
    viewCart: 'View Cart',
    placeOrder: 'Place Order',
    payWithCard: 'Pay with Card',
    payAtCounter: 'Pay at Counter',
    orderPlaced: 'Order Placed!',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    optional: 'Optional',
    required: 'Required',
    total: 'Total',
    subtotal: 'Subtotal',
    quantity: 'Quantity',
    remove: 'Remove',
    emptyCart: 'Your cart is empty',
    continueShopping: 'Continue browsing',
    affiliatePrompt: 'Join us for exclusive offers & deals',
    upsellTitle: 'Would you like to add something?',
    upsellSkip: 'No, thanks',
    upsellAdd: 'Add',
  },
  pt: {
    menu: 'Cardápio',
    cart: 'Carrinho',
    checkout: 'Finalizar Pedido',
    addToCart: 'Adicionar ao Carrinho',
    viewCart: 'Ver Carrinho',
    placeOrder: 'Fazer Pedido',
    payWithCard: 'Pagar com Cartão',
    payAtCounter: 'Pagar no Caixa',
    orderPlaced: 'Pedido Realizado!',
    name: 'Nome',
    email: 'E-mail',
    phone: 'Telefone',
    optional: 'Opcional',
    required: 'Obrigatório',
    total: 'Total',
    subtotal: 'Subtotal',
    quantity: 'Quantidade',
    remove: 'Remover',
    emptyCart: 'Seu carrinho está vazio',
    continueShopping: 'Continuar navegando',
    affiliatePrompt: 'Cadastre-se para ofertas exclusivas',
    upsellTitle: 'Gostaria de adicionar algo?',
    upsellSkip: 'Não, obrigado',
    upsellAdd: 'Adicionar',
  },
  fr: {
    menu: 'Menu',
    cart: 'Panier',
    checkout: 'Commander',
    addToCart: 'Ajouter au Panier',
    viewCart: 'Voir le Panier',
    placeOrder: 'Passer la Commande',
    payWithCard: 'Payer par Carte',
    payAtCounter: 'Payer au Comptoir',
    orderPlaced: 'Commande Passée!',
    name: 'Nom',
    email: 'E-mail',
    phone: 'Téléphone',
    optional: 'Facultatif',
    required: 'Obligatoire',
    total: 'Total',
    subtotal: 'Sous-total',
    quantity: 'Quantité',
    remove: 'Supprimer',
    emptyCart: 'Votre panier est vide',
    continueShopping: 'Continuer à parcourir',
    affiliatePrompt: 'Inscrivez-vous pour des offres exclusives',
    upsellTitle: 'Souhaitez-vous ajouter quelque chose?',
    upsellSkip: 'Non, merci',
    upsellAdd: 'Ajouter',
  },
};

/**
 * Detecta el idioma preferido del navegador y retorna el locale soportado más cercano.
 * Fallback: 'es' (español)
 */
export function detectLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return 'es';

  const browserLang = navigator.language.toLowerCase().split('-')[0];
  const supported: SupportedLocale[] = ['es', 'en', 'pt', 'fr'];

  return supported.includes(browserLang as SupportedLocale)
    ? (browserLang as SupportedLocale)
    : 'es';
}

/**
 * Obtiene las traducciones para un locale dado.
 */
export function getTranslations(locale?: SupportedLocale): TranslationStrings {
  const resolvedLocale = locale ?? detectLocale();
  return translations[resolvedLocale];
}

/**
 * Obtiene una traducción específica por clave.
 */
export function t(key: keyof TranslationStrings, locale?: SupportedLocale): string {
  return getTranslations(locale)[key];
}
