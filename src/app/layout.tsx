import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'FoodTech SaaS — Pedidos Móviles para Restaurantes',
  description:
    'Plataforma multi-tenant de pedidos QR para restaurantes Fast Food y Fast Casual. Kiosko móvil, Kitchen Display System, y gestión de menú en tiempo real.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
