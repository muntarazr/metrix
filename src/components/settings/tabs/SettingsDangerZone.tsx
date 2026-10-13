'use client';

import { LogOut } from 'lucide-react';
import type { Language } from '@/lib/translations';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface SettingsDangerZoneProps {
    signingOut: boolean;
    onSignOut: () => void;
    language: Language;
}

export default function SettingsDangerZone({
    signingOut,
    onSignOut,
    language,
}: SettingsDangerZoneProps) {
    const t = translations[language];

    return (
        <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            className={cn(
                "w-full flex items-center justify-center gap-2 py-3 px-2.5 sm:p-2.5 touch-manipulation rounded-xl border transition-all duration-200 font-medium text-xs cursor-pointer shadow-xs",
                signingOut
                    ? "bg-muted/20 border-border/45 text-muted-foreground cursor-not-allowed"
                    : "border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive active:scale-[0.98]"
            )}
        >
            {signingOut ? (
                <>
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                    {t.signingOut}
                </>
            ) : (
                <>
                    <LogOut className="w-4 h-4 shrink-0" />
                    {t.signOut}
                </>
            )}
        </button>
    );
}
