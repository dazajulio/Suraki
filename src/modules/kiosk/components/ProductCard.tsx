'use client';

import { useState } from 'react';
import type { ProductWithModifiers } from '@/types/database';
import { formatPrice, truncate } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: ProductWithModifiers;
  onAdd: (product: ProductWithModifiers) => void;
  currency: string;
}

export function ProductCard({ product, onAdd, currency }: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="group flex bg-white border border-gray-200/60 rounded-xl overflow-hidden card-hover p-3 gap-3 items-center">
      {/* Product Image Area */}
      <div className="relative w-20 h-20 shrink-0 bg-white overflow-hidden rounded-lg border border-gray-100 flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-500 ${
              imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
            <span className="text-xs">Sin foto</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-col flex-grow min-w-0">
        <h3 className="font-semibold text-sm text-gray-900 truncate">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-tight">
            {product.description}
          </p>
        )}
        
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold text-sm text-gray-900">
            {formatPrice(product.base_price, currency)}
          </span>
          <button
            onClick={() => onAdd(product)}
            className="brand-bg hover:brightness-110 text-white rounded-full p-1.5 transition-all flex items-center justify-center shadow-sm active:scale-95"
            aria-label={t('addToCart')}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
