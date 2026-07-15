'use client';

import { useState, useEffect } from 'react';
import { createClient, SURAKI_ID } from '@/lib/supabase/client';
import type { Product, Category } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import { Search, UtensilsCrossed, Plus, FolderPlus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { ProductFormModal } from './ProductFormModal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ProductRow } from './ProductRow';

interface MenuToggleProps {
  restaurantId: string;
}

export function MenuToggle({ restaurantId }: MenuToggleProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<any[]>([]); // Any for ProductWithModifiers
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<any>(null);
  const supabase = createClient();

  const loadMenu = async () => {
    setIsLoading(true);
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order_index');
      
    const { data: prods } = await supabase
      .from('products')
      .select('*, modifier_groups(*, modifiers(*))')
      .eq('restaurant_id', restaurantId)
      .order('order_index');

    if (cats) setCategories(cats);
    if (prods) {
      // Ensure products are sorted by order_index
      const sorted = [...prods].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setProducts(sorted);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMenu();
  }, [restaurantId, supabase]);

  const deleteProduct = async (productId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto? Se borrarán todos sus modificadores.')) return;
    
    // Optimistic update
    setProducts(products.filter(p => p.id !== productId));

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Error deleting:', error);
      alert('No se pudo eliminar el producto');
      loadMenu(); // reload to revert
    }
  };

  const toggleProduct = async (product: any) => {
    // Optimistic update
    const newValue = !product.is_available;
    setProducts(products.map(p => p.id === product.id ? { ...p, is_available: newValue } : p));

    const { error } = await supabase
      .from('products')
      .update({ is_available: newValue } as any)
      .eq('id', product.id);

    if (error) {
      // Revert on error
      setProducts(products.map(p => p.id === product.id ? { ...p, is_available: !newValue } : p));
      console.error(error);
    }
  };

  const toggleModifier = async (productId: string, modifierId: string, currentStatus: boolean) => {
    const newValue = !currentStatus;
    
    // Optimistic update
    setProducts(products.map(p => {
      if (p.id !== productId) return p;
      return {
        ...p,
        modifier_groups: p.modifier_groups.map((mg: any) => ({
          ...mg,
          modifiers: mg.modifiers.map((m: any) => m.id === modifierId ? { ...m, is_available: newValue } : m)
        }))
      };
    }));

    const { error } = await supabase
      .from('modifiers')
      .update({ is_available: newValue } as any)
      .eq('id', modifierId);

    if (error) {
      console.error(error);
    }
  };

  const createCategory = async () => {
    const name = window.prompt('Nombre de la nueva categoría:');
    if (!name?.trim()) return;

    const { error } = await supabase
      .from('categories')
      .insert({ restaurant_id: SURAKI_ID, name: name.trim() });
    
    if (error) alert('Error al crear la categoría');
    else loadMenu();
  };

  const editCategory = async (category: Category) => {
    const newName = window.prompt('Nuevo nombre para la categoría:', category.name);
    if (!newName?.trim() || newName === category.name) return;

    const { error } = await supabase
      .from('categories')
      .update({ name: newName.trim() } as any)
      .eq('id', category.id);

    if (error) alert('Error al actualizar la categoría');
    else loadMenu();
  };

  const deleteCategory = async (category: Category, productCount: number) => {
    if (productCount > 0) {
      alert(`No puedes eliminar esta categoría porque tiene ${productCount} productos. Mueve o elimina los productos primero.`);
      return;
    }
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?`)) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id);

    if (error) alert('Error al eliminar la categoría');
    else loadMenu();
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    // Category Reordering
    if (type === 'category') {
      const newCategories = Array.from(categories);
      const [movedCat] = newCategories.splice(source.index, 1);
      newCategories.splice(destination.index, 0, movedCat);
      
      const updatedCats = newCategories.map((c, idx) => ({ ...c, order_index: idx }));
      setCategories(updatedCats);
      
      for (let i = 0; i < updatedCats.length; i++) {
        const cat = updatedCats[i];
        supabase.from('categories').update({ order_index: i } as any).eq('id', cat.id).then(({ error }) => {
          if (error) console.error('Failed to save order for category', cat.id, error);
        });
      }
      return;
    }

    // Product Reordering
    if (source.droppableId !== destination.droppableId) return; // Only allow reorder inside same category

    const categoryId = source.droppableId;
    const categoryProducts = products.filter(p => p.category_id === categoryId).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    const otherProducts = products.filter(p => p.category_id !== categoryId);

    // Reorder array
    const [movedItem] = categoryProducts.splice(source.index, 1);
    categoryProducts.splice(destination.index, 0, movedItem);

    // Update index locally
    const updatedCategoryProducts = categoryProducts.map((p, index) => ({
      ...p,
      order_index: index,
    }));

    setProducts([...otherProducts, ...updatedCategoryProducts]);

    // Persist to db (fire and forget for snappy UX)
    for (let i = 0; i < updatedCategoryProducts.length; i++) {
      const prod = updatedCategoryProducts[i];
      supabase.from('products').update({ order_index: i } as any).eq('id', prod.id).then(({ error }) => {
        if (error) console.error('Failed to save order for', prod.id, error);
      });
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading && products.length === 0) {
    return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-14 pr-6 text-lg text-gray-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={createCategory}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl px-5 py-4 font-bold flex items-center justify-center transition-all flex-1 sm:flex-none whitespace-nowrap"
          >
            <FolderPlus className="w-5 h-5 mr-2" />
            Categoría
          </button>
          <button 
            onClick={() => {
              setProductToEdit(null);
              setIsModalOpen(true);
            }}
            className="brand-bg hover:brightness-110 text-white rounded-2xl px-5 py-4 font-bold flex items-center justify-center transition-all flex-1 sm:flex-none whitespace-nowrap shadow-lg shadow-red-600/20"
          >
            <Plus className="w-5 h-5 mr-2" />
            Producto
          </button>
        </div>
      </div>

      {/* Categories */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" type="category">
          {(boardProvided) => (
            <div 
              className="space-y-8"
              {...boardProvided.droppableProps} 
              ref={boardProvided.innerRef}
            >
              {categories.map((category, catIndex) => {
                const categoryProducts = filteredProducts
                  .filter(p => p.category_id === category.id)
                  .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

                return (
                  <Draggable key={category.id} draggableId={`cat-${category.id}`} index={catIndex}>
                    {(catProvided, catSnapshot) => (
                      <div 
                        ref={catProvided.innerRef}
                        {...catProvided.draggableProps}
                        className={`bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl ${catSnapshot.isDragging ? 'ring-2 ring-red-600 shadow-2xl z-50' : ''}`}
                      >
                        <div className="bg-gray-100/50 px-6 py-5 flex items-center gap-3 border-b border-gray-200 group">
                          <div {...catProvided.dragHandleProps} className="text-gray-400 hover:text-gray-900 cursor-grab active:cursor-grabbing p-1 -ml-2">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <UtensilsCrossed className="w-5 h-5 text-red-600 flex-shrink-0" />
                          <h2 className="text-xl font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">{category.name}</h2>
                          
                          <div className="flex gap-1 ml-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => editCategory(category)}
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                              title="Editar nombre de categoría"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteCategory(category, categoryProducts.length)}
                              className="p-1.5 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                              title="Eliminar categoría"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <span className="ml-auto text-sm text-gray-400 font-medium">{categoryProducts.length} productos</span>
                        </div>
                        
                        <Droppable droppableId={category.id} type="product">
                          {(provided) => (
                            <div 
                              {...provided.droppableProps} 
                              ref={provided.innerRef}
                              className="divide-y divide-zinc-800/50 min-h-[50px]"
                            >
                              {categoryProducts.length === 0 ? (
                                <div className="p-6 text-center text-gray-400 italic">No hay productos en esta categoría.</div>
                              ) : (
                                categoryProducts.map((product, index) => (
                                  <ProductRow 
                                    key={product.id}
                                    product={product}
                                    index={index}
                                    onEdit={(prod) => {
                                      setProductToEdit(prod);
                                      setIsModalOpen(true);
                                    }}
                                    onDelete={deleteProduct}
                                    onToggleProduct={toggleProduct}
                                    onToggleModifier={toggleModifier}
                                  />
                                ))
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {boardProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <ProductFormModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setProductToEdit(null);
        }}
        onSaved={() => {
          loadMenu();
        }}
        restaurantId={restaurantId}
        categories={categories}
        productToEdit={productToEdit}
      />
    </div>
  );
}
