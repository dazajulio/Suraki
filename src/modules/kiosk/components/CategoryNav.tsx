'use client';

import { useRef, useEffect } from 'react';
import type { Category } from '@/types/database';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface CategoryNavProps {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function CategoryNav({ categories, activeId, onSelect }: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active item into view
  useEffect(() => {
    if (activeId && scrollRef.current) {
      const activeEl = scrollRef.current.querySelector(`[data-id="${activeId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeId]);

  return (
    <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm py-3">
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-3 px-4 category-nav snap-x"
      >
        {categories.map((category) => {
          const isActive = category.id === activeId;
          const Icon = category.icon && (Icons as any)[category.icon] 
            ? (Icons as any)[category.icon] 
            : null;

          return (
            <button
              key={category.id}
              data-id={category.id}
              onClick={() => onSelect(category.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all snap-start",
                isActive 
                  ? "brand-bg text-white shadow-md shadow-black/20" 
                  : "bg-white text-gray-500 hover:text-zinc-200 hover:bg-gray-100"
              )}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
