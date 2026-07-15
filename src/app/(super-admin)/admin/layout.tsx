import Link from 'next/link';
import { Cpu, Users, CreditCard, Settings, LayoutDashboard } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-700 font-sans flex flex-col md:flex-row">
      {/* ── SIDEBAR ── */}
      <aside className="w-full md:w-64 border-r border-white/5 bg-[#0A0A0B]/80 backdrop-blur-md p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-12">
          <Cpu className="w-6 h-6 text-purple-400" />
          <span className="text-xl font-bold tracking-tight text-white">mtriq<span className="text-purple-400">.app</span></span>
          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full ml-auto uppercase tracking-wider font-bold">Admin</span>
        </div>

        <nav className="space-y-2 flex-1">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 text-purple-400 font-medium transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/admin/tenants" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <Users className="w-5 h-5" />
            Tenants (Clientes)
          </Link>
          <Link href="/admin/billing" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <CreditCard className="w-5 h-5" />
            Facturación
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <Settings className="w-5 h-5" />
            Configuración Global
          </Link>
        </nav>
        
        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold">
              JD
            </div>
            <div>
              <p className="text-sm font-bold text-white">Julio Daza</p>
              <p className="text-xs text-gray-400">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        <header className="h-16 border-b border-white/5 bg-[#0A0A0B]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-white">Centro de Comando</h1>
          <div className="flex items-center gap-4">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Sistemas Operativos"></span>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
