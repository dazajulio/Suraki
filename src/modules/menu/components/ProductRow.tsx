'use client';

import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { formatPrice } from '@/lib/utils';
import { Edit2, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';

interface ProductRowProps {
  product: any;
  index: number;
  onEdit: (product: any) => void;
  onDelete: (productId: string) => void;
  onToggleProduct: (product: any) => void;
  onToggleModifier: (productId: string, modifierId: string, status: boolean) => void;
}

export function ProductRow({
  product,
  index,
  onEdit,
  onDelete,
  onToggleProduct,
  onToggleModifier
}: ProductRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Draggable draggableId={product.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`divide-y divide-zinc-800/50 bg-white border-b border-gray-200/50 ${snapshot.isDragging ? 'shadow-2xl shadow-red-600/10 z-50 ring-1 ring-red-600/50 rounded-xl' : ''}`}
        >
          {/* Main Row */}
          <div className={`p-4 sm:p-6 flex items-center gap-3 transition-colors ${
            !product.is_available ? 'bg-red-500/5' : ''
          }`}>
            {/* Drag Handle */}
            <div 
              {...provided.dragHandleProps} 
              className="p-2 text-gray-400 hover:text-gray-900 cursor-grab active:cursor-grabbing flex-shrink-0"
            >
              <GripVertical className="w-5 h-5" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg sm:text-xl font-bold truncate ${!product.is_available ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                {product.name}
              </h3>
              <p className="text-gray-500 mt-1 font-medium">{formatPrice(product.base_price, 'USD')}</p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button 
                onClick={() => onEdit(product)}
                className="p-2 sm:p-3 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors"
                title="Editar Producto"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onDelete(product.id)}
                className="p-2 sm:p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                title="Eliminar Producto"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              
              <div 
                onClick={() => onToggleProduct(product)}
                className={`toggle-switch flex-shrink-0 ml-1 sm:ml-2 scale-75 sm:scale-100 cursor-pointer ${product.is_available ? 'active' : 'inactive'}`}
              ></div>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="ml-2 p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                title={isExpanded ? "Ocultar detalles" : "Ver detalles"}
              >
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Expanded Details (Modifiers, Image, Description) */}
          {isExpanded && (
            <div className="bg-white/50 p-6 flex flex-col gap-6">
              {/* Description & Image */}
              {(product.description || product.image_url) && (
                <div className="flex gap-4 items-start">
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="w-20 h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                  )}
                  {product.description && (
                    <p className="text-gray-500 text-sm">{product.description}</p>
                  )}
                </div>
              )}

              {/* Modifiers List */}
              {product.modifier_groups && product.modifier_groups.length > 0 ? (
                <div className="space-y-4">
                  {product.modifier_groups.map((group: any) => (
                    <div key={group.id} className="bg-white border border-gray-200/80 rounded-xl px-5 py-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider flex items-center justify-between">
                        {group.name}
                        <span className="text-xs normal-case font-normal bg-gray-100 px-2 py-1 rounded-md">
                          {group.min_selections} - {group.max_selections} opciones
                        </span>
                      </h4>
                      <div className="space-y-3">
                        {group.modifiers.map((modifier: any) => (
                          <div key={modifier.id} className="flex items-center justify-between">
                            <span className={`text-sm ${!modifier.is_available ? 'text-zinc-600 line-through' : 'text-gray-700'}`}>
                              {modifier.name} {modifier.extra_price > 0 && <span className="text-brand-primary ml-1">(+{formatPrice(modifier.extra_price, 'USD')})</span>}
                            </span>
                            <div 
                              onClick={() => onToggleModifier(product.id, modifier.id, modifier.is_available)}
                              className={`toggle-switch scale-75 origin-right cursor-pointer ${modifier.is_available ? 'active' : 'inactive'}`}
                            ></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-600 italic">No hay modificadores configurados para este producto.</p>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
