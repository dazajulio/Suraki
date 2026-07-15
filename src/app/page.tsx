import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-700 font-sans flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8 text-red-600">Suraki</h1>
      <p className="mb-8">Versión simplificada (Admin y Kiosko)</p>
      <div className="flex gap-4">
        <Link href="/gerente/kitchen" className="px-6 py-3 bg-gray-100 rounded hover:bg-gray-200">
          Admin Dashboard
        </Link>
        <Link href="/burger-palace/mesa/1" className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700">
          Kiosko Demo
        </Link>
      </div>
    </div>
  );
}
