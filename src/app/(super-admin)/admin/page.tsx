import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Building2, CreditCard, Activity, ArrowUpRight } from 'lucide-react';

export default async function SuperAdminDashboard() {
  const supabase = await createServerSupabaseClient();
  
  // Fetch real data for the global dashboard
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });

  const activeRestaurants = restaurants?.filter(r => r.is_active) || [];
  
  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Visión Global</h2>
        <p className="text-gray-500">Métricas principales de mtriq.app</p>
      </div>

      {/* ── METRICS CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Building2 className="w-6 h-6 text-purple-400" />
            </div>
            <span className="flex items-center text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
              +12% <ArrowUpRight className="w-3 h-3 ml-1" />
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">Tenants Activos</h3>
          <p className="text-3xl font-bold text-white">{activeRestaurants.length}</p>
        </div>

        <div className="bg-white/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl">
              <CreditCard className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="flex items-center text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
              +5% <ArrowUpRight className="w-3 h-3 ml-1" />
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">MRR (Ingreso Recurrente)</h3>
          <p className="text-3xl font-bold text-white">
            ${(activeRestaurants.length * 29).toLocaleString()}
          </p>
        </div>

        <div className="bg-white/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <span className="flex items-center text-xs font-medium text-gray-500 bg-white/5 px-2 py-1 rounded-full">
              Estable
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">Carga del Sistema</h3>
          <p className="text-3xl font-bold text-white">99.9%</p>
        </div>
      </div>

      {/* ── RECENT TENANTS TABLE ── */}
      <div className="bg-white/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Últimos Restaurantes Afiliados</h3>
          <button className="text-sm text-purple-400 hover:text-purple-300 font-medium">Ver todos</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Restaurante</th>
                <th className="px-6 py-4 font-medium">Identificación (Slug)</th>
                <th className="px-6 py-4 font-medium">Estatus</th>
                <th className="px-6 py-4 font-medium">Fecha de Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-700">
              {restaurants?.slice(0, 5).map((tenant) => (
                <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                    {tenant.logo_url ? (
                      <img src={tenant.logo_url} alt={tenant.name} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold">
                        {tenant.name.substring(0,2).toUpperCase()}
                      </div>
                    )}
                    {tenant.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-500">{tenant.slug}</td>
                  <td className="px-6 py-4">
                    {tenant.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {restaurants?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    No hay restaurantes registrados aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
