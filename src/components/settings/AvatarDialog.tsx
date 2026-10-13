'use client';

import { Camera } from 'lucide-react';
import type { Language } from '@/lib/translations';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PRESET_AVATARS } from './types';

interface AvatarDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    avatarUrl: string | null;
    displayName: string;
    userEmail?: string;
    updatingProfile: boolean;
    onSelectPresetAvatar: (url: string) => void;
    onUploadClick: () => void;
    onRemovePhoto: () => void;
    language: Language;
}

export default function AvatarDialog({
    isOpen,
    onOpenChange,
    avatarUrl,
    displayName,
    userEmail,
    updatingProfile,
    onSelectPresetAvatar,
    onUploadClick,
    onRemovePhoto,
    language,
}: AvatarDialogProps) {
    const isArabic = language === 'ar';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-xs p-5 rounded-2xl" dir={isArabic ? 'rtl' : 'ltr'}>
                <DialogHeader className="pb-1 text-center">
                    <DialogTitle className="text-base font-bold text-foreground">
                        {isArabic ? "الصورة الشخصية" : "Profile Picture"}
                    </DialogTitle>
                </DialogHeader>

                {/* Current Preview */}
                <div className="flex justify-center my-2">
                    <div className="w-18 h-18 rounded-full overflow-hidden bg-muted/80 border border-border/70 shadow-xs flex items-center justify-center">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl font-black text-foreground">
                                {displayName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'U'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Primary Action: Upload Photo */}
                <Button
                    type="button"
                    onClick={onUploadClick}
                    disabled={updatingProfile}
                    className="w-full flex items-center justify-center gap-2 text-xs font-medium rounded-lg h-9 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                >
                    <Camera className="w-4 h-4" />
                    <span>{isArabic ? "رفع صورتك من جهازك" : "Upload your photo"}</span>
                </Button>

                {/* Subtle divider */}
                <div className="flex items-center gap-2 my-2 text-[10px] text-muted-foreground">
                    <div className="h-px flex-1 bg-border/60" />
                    <span>{isArabic ? "أو اختر رسماً مبسطاً" : "Or choose a sketch"}</span>
                    <div className="h-px flex-1 bg-border/60" />
                </div>

                {/* Minimalist sketches */}
                <div className="grid grid-cols-4 gap-2">
                    {PRESET_AVATARS.map((preset) => {
                        const isSelected = avatarUrl === preset.url;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => onSelectPresetAvatar(preset.url)}
                                disabled={updatingProfile}
                                className={cn(
                                    "aspect-square rounded-full p-1 border-2 transition-transform active:scale-95 bg-muted/40 cursor-pointer overflow-hidden flex items-center justify-center",
                                    isSelected
                                        ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                                        : "border-border/70 hover:border-primary/40"
                                )}
                                title={preset.label}
                            >
                                <img src={preset.url} alt="" className="w-full h-full object-contain" />
                            </button>
                        );
                    })}
                </div>

                {avatarUrl && (
                    <button
                        type="button"
                        onClick={() => {
                            onRemovePhoto();
                            onOpenChange(false);
                        }}
                        disabled={updatingProfile}
                        className="text-[11px] font-semibold text-destructive hover:underline text-center pt-2 cursor-pointer w-full"
                    >
                        {isArabic ? "إزالة الصورة واستخدام الحرف الأول" : "Remove photo (use initials)"}
                    </button>
                )}
            </DialogContent>
        </Dialog>
    );
}
