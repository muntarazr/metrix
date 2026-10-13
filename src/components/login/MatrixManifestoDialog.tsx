'use client';

import * as Dialog from '@radix-ui/react-dialog';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/translations';

const copy = {
  ar: {
    badge: 'البيان التأسيسي',
    title: 'لماذا صممت ماتريكس؟',
    body: '\u201Cأنا لا أبحث عن مجرد \u2018النجاح\u2019. لدي هدف ضخم يحدد وجودي، هدفٌ إن متُّ قبل تحقيقه فلن أكون راضياً عن نفسي أبداً، لدرجة أنني لو مُنحت الجنة دونه لاخترت الجحيم. ماتريكس ليس قائمة مهام عادية (To-Do List) لتدوين يومياتك، إنه \u2018نظام تتبع صارم\u2019. صممته لنفسي لأراقب هدفي بلا رحمة، ولأعرف بالضبط ماذا أنجزت كل يوم بالبيانات والأرقام. هنا، لا مجال للأعذار والتسويف.\u201D',
    close: 'أنا مستعد',
  },
  en: {
    badge: 'The founding statement',
    title: 'Why I built METRIX',
    body: '\u201CI am not after \u2018success\u2019 in the abstract. I have one enormous goal that defines my existence \u2014 a goal I would never forgive myself for dying without reaching, to the point that if I were offered heaven without it I would take hell instead. METRIX is not an ordinary to-do list for jotting down your day. It is a strict tracking system. I built it for myself, to watch my goal without mercy, and to know exactly what I accomplished each day in data and numbers. There is no room here for excuses or procrastination.\u201D',
    close: "I'm ready",
  },
} as const;

interface MatrixManifestoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: Language;
}

export function MatrixManifestoDialog({
  open,
  onOpenChange,
  language = 'ar',
}: MatrixManifestoDialogProps) {
  const t = copy[language];
  const isArabic = language === 'ar';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <Dialog.Content
          dir={isArabic ? 'rtl' : 'ltr'}
          className={cn(
            'scrollbar-thin overscroll-contain fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[36rem] max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] -translate-x-1/2 -translate-y-1/2 overflow-x-hidden overflow-y-auto rounded-[1.5rem] sm:rounded-[2rem] border border-border bg-background shadow-[0_32px_90px_rgba(15,23,42,0.18)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            isArabic ? 'text-right' : 'text-left'
          )}
        >
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-black/15 to-transparent" />

          <div className="space-y-4 sm:space-y-6 p-4 min-[380px]:p-5 sm:p-7">
            <div className="space-y-2.5 sm:space-y-3">
              <div className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-[0.72rem] font-semibold text-muted-foreground">
                {t.badge}
              </div>

              <Dialog.Title className="text-xl min-[380px]:text-2xl font-bold leading-tight text-foreground sm:text-[2rem]">
                {t.title}
              </Dialog.Title>
            </div>

            <div className="rounded-[1.25rem] sm:rounded-[1.5rem] border border-border bg-muted/60 p-3.5 min-[380px]:p-4 sm:p-5">
              <Dialog.Description className="text-sm leading-7 sm:leading-8 text-muted-foreground sm:text-[0.98rem]">
                {t.body}
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <Button className="h-12 w-full rounded-2xl text-base font-semibold shadow-[0_18px_40px_rgba(15,23,42,0.16)] sm:h-14">
                {t.close}
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
