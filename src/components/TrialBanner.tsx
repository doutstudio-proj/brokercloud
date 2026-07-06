"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LockScreen } from "./LockScreen";

export function TrialBanner({ trialEndsAt }: { trialEndsAt: Date | null }) {
  const [showLockScreen, setShowLockScreen] = useState(false);

  if (!trialEndsAt) return null;

  const now = new Date();
  const endsAt = new Date(trialEndsAt);
  const diffTime = endsAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return null; // Já é tratado pelo LockScreen no layout

  return (
    <>
      <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-3 w-full shrink-0">
        <AlertCircle className="text-amber-600 w-5 h-5" />
        <span className="text-amber-800 font-medium text-sm">
          Você tem <strong className="font-bold text-amber-900">{diffDays} dias</strong> restantes no seu teste grátis (Acesso Premium).
        </span>
        <button 
          onClick={() => setShowLockScreen(true)}
          className="ml-4 bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm"
        >
          Assinar Agora
        </button>
      </div>

      {showLockScreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full h-full">
            <LockScreen />
            <button 
              onClick={() => setShowLockScreen(false)}
              className="absolute top-6 right-6 text-white bg-black/50 hover:bg-black/80 rounded-full p-2 z-[200]"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
