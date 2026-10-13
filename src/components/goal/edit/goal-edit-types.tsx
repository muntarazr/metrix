import { type ElementType } from 'react';
import { format } from 'date-fns';
import { arSA, enUS } from 'react-day-picker/locale';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Language } from '@/lib/translations';

export interface EditableGoal {
  id: string;
  title: string;
  current_points: number;
  target_points: number;
  created_at: string;
  estimated_completion_date: string;
  total_days?: number;
  ai_summary?: string;
  icon?: string;
}

export interface TaskDraft {
  id: string;
  task_description: string;
  task_type: 'main' | 'sub';
  parent_task_id: string | null;
  frequency: string;
  impact_weight: number;
  time_required_minutes: number;
  completion_criteria: string;
}

export type TaskChange =
  | {
      op: 'update';
      id: string;
      task_description?: string;
      frequency?: string;
      impact_weight?: number;
      time_required_minutes?: number;
      completion_criteria?: string;
    }
  | {
      op: 'add';
      task_type: 'main' | 'sub';
      parent_task_id: string | null;
      task_description: string;
      frequency: string;
      impact_weight: number;
      time_required_minutes: number;
      completion_criteria: string;
    }
  | { op: 'remove'; id: string; reason?: string };

export interface GoalEditDialogProps {
  goal: EditableGoal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  language?: Language;
}

export interface DatePopoverFieldProps {
  icon: ElementType;
  isArabic: boolean;
  label: string;
  locale: typeof arSA | typeof enUS;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
  minDate?: string;
}

export const getDateInputValue = (value?: string | null) => {
  if (!value) {
    return format(new Date(), 'yyyy-MM-dd');
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return format(new Date(), 'yyyy-MM-dd');
  }

  return format(parsed, 'yyyy-MM-dd');
};

export const dateInputToDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const dateInputToStableIso = (value: string) => `${value}T12:00:00.000Z`;

export const getGoalDays = (startDate: string, endDate: string) => {
  const start = dateInputToDate(startDate);
  const end = dateInputToDate(endDate);
  const diffInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffInDays);
};

export function DatePopoverField({
  icon: Icon,
  isArabic,
  label,
  locale,
  onChange,
  placeholder,
  value,
  minDate,
}: DatePopoverFieldProps) {
  const minimumDate = minDate ? dateInputToDate(minDate) : undefined;

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground/80">
        <Icon className="size-3.5 text-primary/70" />
        <span>{label}</span>
      </Label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-11 w-full rounded-xl border-border/80 bg-card px-3.5 font-normal shadow-xs hover:border-primary/40 transition-colors',
              isArabic ? 'justify-end text-right' : 'justify-start text-left',
              !value && 'text-muted-foreground',
            )}
          >
            <Calendar className="size-4 shrink-0 text-primary/60 mr-2 rtl:mr-0 rtl:ml-2" />
            <span className="truncate text-xs sm:text-sm font-medium">
              {value ? format(dateInputToDate(value), 'PPP', { locale }) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto border-border/70 p-0 shadow-xl rounded-2xl"
          align={isArabic ? 'end' : 'start'}
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <ShadcnCalendar
            mode="single"
            selected={value ? dateInputToDate(value) : undefined}
            onSelect={(date: Date | undefined) => onChange(date ? format(date, 'yyyy-MM-dd') : '')}
            initialFocus
            captionLayout="dropdown"
            locale={locale}
            dir={isArabic ? 'rtl' : 'ltr'}
            fromYear={2020}
            toYear={2035}
            disabled={minimumDate ? (date) => date < minimumDate : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
