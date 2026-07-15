'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Table } from '@/types/database';
import { Download, QrCode, Plus, Trash2, Edit2 } from 'lucide-react';

interface QRGeneratorProps {
  restaurantId: string;
  restaurantSlug: string;
  brandColor: string;
}

export function QRGenerator({ restaurantId, restaurantSlug, brandColor }: QRGeneratorProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const domain = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  const loadTables = async () => {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('table_number');
    if (data) setTables(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTables();
  }, [restaurantId, supabase]);

  const handleCreateTable = async () => {
    const label = window.prompt("Ingresa el nombre o número de la nueva mesa (Ej. Mesa 7):");
    if (!label) return;
    
    setIsLoading(true);
    const maxNumber = tables.length > 0 ? Math.max(...tables.map(t => t.table_number)) : 0;
    
    const { error } = await supabase
      .from('tables')
      .insert({
        restaurant_id: restaurantId,
        table_number: maxNumber + 1,
        label: label,
        is_active: true
      } as any);
      
    if (error) {
      alert("Error al crear mesa.");
      console.error(error);
      setIsLoading(false);
    } else {
      loadTables();
    }
  };

  const handleEditTable = async (tableId: string, currentLabel: string) => {
    const newLabel = window.prompt("Ingresa el nuevo nombre de la mesa:", currentLabel || '');
    if (!newLabel || newLabel === currentLabel) return;
    
    setIsLoading(true);
    const { error } = await supabase
      .from('tables')
      .update({ label: newLabel } as any)
      .eq('id', tableId);
      
    if (error) {
      alert("Error al editar la mesa.");
      console.error(error);
      setIsLoading(false);
    } else {
      loadTables();
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    const confirmed = window.confirm("¿Estás seguro de que deseas eliminar esta mesa? Los pedidos vinculados a ella podrían verse afectados.");
    if (!confirmed) return;
    
    setIsLoading(true);
    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', tableId);
      
    if (error) {
      alert("Error al eliminar la mesa.");
      console.error(error);
      setIsLoading(false);
    } else {
      loadTables();
    }
  };

  const downloadAll = () => {
    // In a real app, this would generate a PDF or zip file with all QR codes
    alert('Función de "Descargar Todos" requeriría una librería como jszip o jsPDF.');
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-end gap-4">
        <button 
          onClick={handleCreateTable}
          className="brand-bg hover:brightness-110 text-white font-medium py-3 px-6 rounded-xl flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Crear Mesa
        </button>
        <button 
          onClick={downloadAll}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-xl flex items-center gap-2 transition-colors"
        >
          <Download className="w-5 h-5" />
          Descargar Todos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map(table => {
          const url = `${domain}/${restaurantSlug}/mesa/${table.id}`;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&color=000000&bgcolor=ffffff`;

          return (
            <div key={table.id} className="bg-white rounded-2xl overflow-hidden border border-zinc-200 flex flex-col relative group">
              {/* Table Actions Overlay */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEditTable(table.id, table.label || '')}
                  className="p-2 bg-black/50 hover:bg-black/80 rounded-lg text-white backdrop-blur-sm transition-colors"
                  title="Editar Mesa"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteTable(table.id)}
                  className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white backdrop-blur-sm transition-colors"
                  title="Eliminar Mesa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div 
                className="py-4 text-center text-white font-bold text-xl"
                style={{ backgroundColor: brandColor }}
              >
                {table.label || `Mesa ${table.table_number}`}
              </div>
              
              <div className="p-8 flex-1 flex flex-col items-center justify-center bg-white">
                <img src={qrUrl} alt={`QR Mesa ${table.table_number}`} className="w-48 h-48 mb-6" />
                <p className="text-gray-400 text-sm text-center mb-6 break-all max-w-[200px]">
                  {url.replace(/^https?:\/\//, '')}
                </p>
                <a 
                  href={qrUrl}
                  download={`QR_Mesa_${table.table_number}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-zinc-300"
                >
                  <Download className="w-5 h-5" />
                  Descargar PNG
                </a>
              </div>
            </div>
          );
        })}
        
        {tables.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white/50 rounded-2xl border border-gray-200 border-dashed">
            <QrCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay mesas configuradas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
