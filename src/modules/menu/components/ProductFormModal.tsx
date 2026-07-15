'use client';

import { useState, useEffect } from 'react';
import type { Category } from '@/types/database';
import { X, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  restaurantId: string;
  categories: Category[];
  productToEdit?: any;
}

interface ModifierInput {
  name: string;
  extra_price: number;
}

interface GroupInput {
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  modifiers: ModifierInput[];
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSaved,
  restaurantId,
  categories,
  productToEdit
}: ProductFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [groups, setGroups] = useState<GroupInput[]>([]);

  // Use useEffect to reset state when modal opens or productToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setName(productToEdit.name || '');
        setDescription(productToEdit.description || '');
        setPrice(productToEdit.base_price || 0);
        setCategoryId(productToEdit.category_id || (categories[0]?.id || ''));
        setImageUrl(productToEdit.image_url || '');
        
        // Map groups
        if (productToEdit.modifier_groups) {
          const mappedGroups = productToEdit.modifier_groups.map((g: any) => ({
            name: g.name,
            is_required: g.is_required,
            min_selections: g.min_selections,
            max_selections: g.max_selections,
            modifiers: (g.modifiers || []).map((m: any) => ({
              name: m.name,
              extra_price: m.extra_price
            }))
          }));
          setGroups(mappedGroups);
        } else {
          setGroups([]);
        }
      } else {
        setName('');
        setDescription('');
        setPrice(0);
        setCategoryId(categories[0]?.id || '');
        setImageUrl('');
        setGroups([]);
      }
    }
  }, [isOpen, productToEdit, categories]);

  if (!isOpen) return null;

  const addGroup = () => {
    setGroups([...groups, { name: '', is_required: false, min_selections: 0, max_selections: 1, modifiers: [] }]);
  };

  const removeGroup = (idx: number) => {
    setGroups(groups.filter((_, i) => i !== idx));
  };

  const addModifier = (groupIdx: number) => {
    const newGroups = [...groups];
    newGroups[groupIdx].modifiers.push({ name: '', extra_price: 0 });
    setGroups(newGroups);
  };

  const removeModifier = (groupIdx: number, modIdx: number) => {
    const newGroups = [...groups];
    newGroups[groupIdx].modifiers = newGroups[groupIdx].modifiers.filter((_, i) => i !== modIdx);
    setGroups(newGroups);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      let productId = '';

      if (productToEdit) {
        // 1A. Update Product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .update({
            category_id: categoryId,
            name,
            description,
            base_price: price,
            image_url: imageUrl || null,
          } as any)
          .eq('id', productToEdit.id)
          .select()
          .single() as any;

        if (productError) throw productError;
        productId = productData.id;

        // Delete existing modifier groups (Cascade deletes modifiers)
        await supabase.from('modifier_groups').delete().eq('product_id', productId);
      } else {
        // 1B. Create Product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .insert({
            restaurant_id: restaurantId,
            category_id: categoryId,
            name,
            description,
            base_price: price,
            image_url: imageUrl || null,
            is_available: true,
            is_featured: false
          } as any)
          .select()
          .single() as any;

        if (productError) throw productError;
        productId = productData.id;
      }

      // 2. Create Modifier Groups and Modifiers
      for (const group of groups) {
        const { data: groupData, error: groupError } = await supabase
          .from('modifier_groups')
          .insert({
            restaurant_id: restaurantId,
            product_id: productId,
            name: group.name,
            is_required: group.is_required,
            min_selections: group.min_selections,
            max_selections: group.max_selections
          } as any)
          .select()
          .single() as any;

        if (groupError) throw groupError;

        if (group.modifiers.length > 0) {
          const modifiersToInsert = group.modifiers.map(m => ({
            group_id: groupData.id,
            name: m.name,
            extra_price: m.extra_price
          }));

          const { error: modError } = await supabase
            .from('modifiers')
            .insert(modifiersToInsert as any);

          if (modError) throw modError;
        }
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Error al crear el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-bold text-gray-900">{productToEdit ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Nombre del producto *</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-brand-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Categoría *</label>
                <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-brand-primary outline-none">
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-brand-primary outline-none" rows={2} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Precio Base ($) *</label>
                <input required type="number" step="0.01" min="0" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-brand-primary outline-none" />
              </div>
              <div className="flex flex-col">
                <label className="block text-sm text-gray-500 mb-1">Imagen del Producto (Opcional)</label>
                <div className="flex gap-2 mb-2">
                  <button 
                    type="button" 
                    onClick={() => setUploadMode('url')} 
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${uploadMode === 'url' ? 'bg-red-600/20 text-red-600 border border-red-600/30' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                  >
                    Enlace (URL)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setUploadMode('file')} 
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${uploadMode === 'file' ? 'bg-red-600/20 text-red-600 border border-red-600/30' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                  >
                    Subir Archivo
                  </button>
                </div>
                
                {uploadMode === 'url' ? (
                  <input type="url" placeholder="https://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-red-600 outline-none transition-all" />
                ) : (
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      // Limit size to 2MB to keep DB small
                      if (file.size > 2 * 1024 * 1024) {
                        alert("La imagen es demasiado grande. El límite es 2MB.");
                        return;
                      }

                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImageUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }} 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-900 focus:ring-2 focus:ring-red-600 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer transition-all" 
                  />
                )}

                {imageUrl && (
                  <div className="mt-3 relative w-full h-32 rounded-xl overflow-hidden border border-gray-200 bg-white">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setImageUrl('')} 
                      className="absolute top-2 right-2 bg-black/50 hover:bg-red-500/80 p-1.5 rounded-full text-white backdrop-blur-sm transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100 my-8" />

          {/* Modifiers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Grupos de Modificadores</h3>
              <button type="button" onClick={addGroup} className="flex items-center text-sm font-medium text-brand-primary hover:brightness-110">
                <Plus className="w-4 h-4 mr-1" />
                Añadir Grupo
              </button>
            </div>

            {groups.length === 0 && (
              <p className="text-gray-400 text-sm">No hay grupos de modificadores. (Ej. "Elige tu término", "Extras").</p>
            )}

            {groups.map((group, groupIdx) => (
              <div key={groupIdx} className="bg-white/50 border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="grid grid-cols-2 gap-3 flex-1 mr-4">
                    <input required placeholder="Nombre del grupo (Ej. Salsas)" value={group.name} onChange={e => {
                      const newGroups = [...groups]; newGroups[groupIdx].name = e.target.value; setGroups(newGroups);
                    }} className="col-span-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900" />
                    
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-gray-500">Min. Selecciones</label>
                      <input type="number" min="0" value={group.min_selections} onChange={e => {
                        const newGroups = [...groups]; newGroups[groupIdx].min_selections = parseInt(e.target.value); 
                        newGroups[groupIdx].is_required = parseInt(e.target.value) > 0;
                        setGroups(newGroups);
                      }} className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-900 text-center" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-gray-500">Max. Selecciones</label>
                      <input type="number" min="1" value={group.max_selections} onChange={e => {
                        const newGroups = [...groups]; newGroups[groupIdx].max_selections = parseInt(e.target.value); setGroups(newGroups);
                      }} className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-900 text-center" />
                    </div>
                  </div>
                  <button type="button" onClick={() => removeGroup(groupIdx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pl-4 border-l-2 border-gray-200 space-y-2">
                  {group.modifiers.map((mod, modIdx) => (
                    <div key={modIdx} className="flex items-center space-x-2">
                      <input required placeholder="Opcion (Ej. Queso Cheddar)" value={mod.name} onChange={e => {
                        const newGroups = [...groups]; newGroups[groupIdx].modifiers[modIdx].name = e.target.value; setGroups(newGroups);
                      }} className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm" />
                      
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-2 text-sm">+$</span>
                        <input type="number" step="0.01" min="0" value={mod.extra_price} onChange={e => {
                          const newGroups = [...groups]; newGroups[groupIdx].modifiers[modIdx].extra_price = parseFloat(e.target.value); setGroups(newGroups);
                        }} className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-sm text-center" />
                      </div>
                      
                      <button type="button" onClick={() => removeModifier(groupIdx, modIdx)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addModifier(groupIdx)} className="text-xs text-gray-500 hover:text-red-600 flex items-center mt-2">
                    <Plus className="w-3 h-3 mr-1" /> Añadir Opción
                  </button>
                </div>
              </div>
            ))}
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-white">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="brand-bg px-6 py-3 rounded-xl font-bold text-white hover:brightness-110 transition-colors flex items-center disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : productToEdit ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
        </div>
      </div>
    </div>
  );
}
