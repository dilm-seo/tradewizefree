import React from 'react';
import { DollarSign } from 'lucide-react';

interface CostToastProps {
  cost: number;
  isVisible: boolean;
}

export default function CostToast({ cost, isVisible }: CostToastProps) {
  if (!isVisible) return null;

  return (
    <div className={`
      fixed bottom-6 left-6 z-50
      flex items-center gap-2 
      bg-gradient-to-r from-emerald-500/10 to-blue-500/10
      border border-emerald-500/20
      backdrop-blur-md
      px-4 py-2 rounded-lg
      shadow-lg
      transform transition-all duration-500
      animate-in slide-in-from-bottom-2
      hover:scale-105
    `}>
      <DollarSign className="w-4 h-4 text-emerald-400" />
      <span className="text-sm font-medium text-emerald-400">
        {cost.toFixed(3)} €
      </span>
    </div>
  );
}