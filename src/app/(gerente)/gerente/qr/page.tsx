import { QRGenerator } from '@/modules/qr/components/QRGenerator';
import { QrCode } from 'lucide-react';

export const metadata = {
  title: 'Códigos QR - Admin',
};

export default function QRAdminPage() {
  // En producción, estos datos vendrían del tenant autenticado
  const restaurantId = process.env.NEXT_PUBLIC_RESTAURANT_ID || '';
  const restaurantSlug = 'burger-palace';
  const brandColor = '#E32626';

  return (
    <div className="p-6 md:p-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <QrCode className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900">Códigos QR de Mesas</h1>
        </div>
        <p className="text-gray-500 text-lg">Genera e imprime los códigos QR para pedidos desde mesa.</p>
      </div>

      <QRGenerator 
        restaurantId={restaurantId} 
        restaurantSlug={restaurantSlug} 
        brandColor={brandColor} 
      />
    </div>
  );
}
