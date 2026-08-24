'use client';

import { cn } from '@/lib/utils';

interface FeedbackBannerProps {
  feedback: { type: 'success' | 'error'; text: string } | null;
}

export function FeedbackBanner({ feedback }: FeedbackBannerProps) {
  if (!feedback) return null;

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 text-xs font-semibold',
        feedback.type === 'success'
          ? 'border-primary/25 bg-primary/12 text-primary'
          : 'border-destructive/25 bg-destructive/12 text-destructive',
      )}
    >
      {feedback.text}
    </div>
  );
}
