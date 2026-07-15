'use client';

import { useState } from 'react';
import { User, Mail, Phone, ChevronRight } from 'lucide-react';
import { isValidEmail } from '@/lib/utils';
import { t } from '@/lib/i18n';

interface CustomerData {
  name: string;
  email: string;
  phone?: string;
}

interface CustomerFormProps {
  onSubmit: (data: CustomerData) => void;
  isLoading?: boolean;
}

export function CustomerForm({ onSubmit, isLoading }: CustomerFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{name?: string; email?: string}>({});

  const validate = () => {
    const newErrors: {name?: string; email?: string} = {};
    if (!name.trim()) newErrors.name = 'Requerido';
    if (!email.trim()) newErrors.email = 'Requerido';
    else if (!isValidEmail(email)) newErrors.email = 'Email inválido';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ name, email, phone: phone || undefined });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="space-y-4">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1.5 ml-1">
            {t('name')} <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({...errors, name: undefined});
              }}
              className={`block w-full pl-11 pr-4 py-3.5 bg-white border rounded-xl text-gray-900 placeholder-zinc-500 focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-all ${
                errors.name ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Ej. Juan Pérez"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1.5 ml-1">
            {t('email')} <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({...errors, email: undefined});
              }}
              className={`block w-full pl-11 pr-4 py-3.5 bg-white border rounded-xl text-gray-900 placeholder-zinc-500 focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-all ${
                errors.email ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="tu@correo.com"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Phone Field (Optional) */}
        <div className="pt-2">
          <div className="flex justify-between items-end mb-1.5 ml-1 mr-1">
            <label className="block text-sm font-medium text-gray-500">
              {t('phone')}
            </label>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
              {t('optional')}
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full pl-11 pr-4 py-3.5 bg-white/60 border border-gray-200 rounded-xl text-gray-900 placeholder-zinc-600 focus:ring-2 focus:ring-red-600/30 focus:border-red-600 transition-all"
              placeholder="+1 234 567 8900"
              disabled={isLoading}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 ml-1">
            ✨ {t('affiliatePrompt')}
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-6 brand-bg hover:brightness-110 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-red-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            Continuar
            <ChevronRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}
