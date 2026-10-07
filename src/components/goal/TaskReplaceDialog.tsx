'use client';

import { useState } from 'react';
import { RefreshCw, X, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/translations';

interface TaskReplaceDialogProps {
    open: boolean;
    taskTitle: string;
    language?: Language;
    isSubmitting?: boolean;
    onClose: () => void;
    onConfirm: (reason: string, customNote: string) => void;
}

export default function TaskReplaceDialog({
    open,
    taskTitle,
    language = 'ar',
    isSubmitting = false,
    onClose,
    onConfirm,
}: TaskReplaceDialogProps) {
    const isArabic = language === 'ar';
    const [userNote, setUserNote] = useState('');

    if (!open) return null;

    const handleSubmit = () => {
        const note = userNote.trim();
        // Reason is directly the user's custom instruction/opinion
        const reason = note || (isArabic ? 'استبدال المهمة وفقاً لرأي المستخدم' : 'Replace task per user preference');
        onConfirm(reason, note);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xl space-y-4"
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <RefreshCw className={cn("w-5 h-5", isSubmitting && "animate-spin")} />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-foreground leading-snug">
                                {isArabic ? 'استبدال هذه المهمة بمهمة بديلة' : 'Replace Task with Alternative'}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-medium">
                                {taskTitle}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                        title={isArabic ? 'إغلاق' : 'Close'}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Free User Note Input - Based purely on user opinion */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                        <MessageSquareText className="w-4 h-4 text-primary" />
                        <span>{isArabic ? 'ما هو رأيك أو التعديل الذي تريده في هذه المهمة؟' : 'What is your opinion or the exact change you want for this task?'}</span>
                    </label>
                    <textarea
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder={
                            isArabic
                                ? 'اكتب رأيك بحرية، مثلاً: استبدلها بركوب الدراجة لمدة 20 دقيقة، أو جعل السعرات 1500، أو تخفيف الجهد لأن وقتي ضيق...'
                                : 'Write your preference freely, e.g., replace with 20 min cycling, or adjust target calories to 1500, or reduce effort due to busy schedule...'
                        }
                        rows={4}
                        autoFocus
                        disabled={isSubmitting}
                        className="w-full text-xs sm:text-sm rounded-xl border border-border/80 bg-muted/20 px-3.5 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary/60 focus:bg-background resize-none leading-relaxed transition-all"
                    />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {isArabic
                            ? 'سيقوم الذكاء الاصطناعي بالالتزام التام بما تكتبه هنا وصياغة مهمة بديلة تناسب طلبك بدقة.'
                            : 'The AI will strictly follow your note here to craft an alternative task matching your exact criteria.'}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                        {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", isSubmitting && "animate-spin")} />
                        <span>{isArabic ? 'استبدال المهمة بملاحظتي' : 'Replace Task with My Note'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
