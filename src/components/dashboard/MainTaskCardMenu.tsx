"use client";

import React from "react";
import {
  MoreVertical,
  FileText,
  CalendarDays,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { MainTask } from "@/lib/task-hierarchy";
import type { EditableTask } from "./TaskEditDialog";
import TaskScheduleDaysPicker from "./TaskScheduleDaysPicker";

export interface MainTaskCardMenuProps {
  main: MainTask;
  mainIdx: number;
  totalMains: number;
  isArabic: boolean;
  t: any;
  setCriteriaDialogTask: React.Dispatch<
    React.SetStateAction<{
      id: string;
      description: string;
      criteria?: string;
      taskType: "main" | "sub";
    } | null>
  >;
  onUpdateTaskScheduleDays?: (taskId: string, days: number[] | null) => Promise<void> | void;
  onMoveMain: (mainId: string, direction: "up" | "down") => void;
  onStartEditingTask: (taskId: string, description: string) => void;
  onOpenTaskEditor: (task: EditableTask) => void;
  onUpdateTaskWeight: (taskId: string, weight: number) => void;
  onUpdateTaskIcon?: (taskId: string, icon: string) => void;
  setTaskToDelete: React.Dispatch<
    React.SetStateAction<{
      id: string;
      description: string;
    } | null>
  >;
}

export function MainTaskCardMenu({
  main,
  mainIdx,
  totalMains,
  isArabic,
  t,
  setCriteriaDialogTask,
  onUpdateTaskScheduleDays,
  onMoveMain,
  onStartEditingTask,
  onOpenTaskEditor,
  onUpdateTaskWeight,
  onUpdateTaskIcon,
  setTaskToDelete,
}: MainTaskCardMenuProps) {
  return (
    <DropdownMenu dir={isArabic ? "rtl" : "ltr"}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-muted/60 active:scale-95 shadow-xs cursor-pointer"
          title={isArabic ? "المزيد" : "More"}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isArabic ? "start" : "end"} className="w-60 sm:w-52 max-w-[calc(100vw-1.5rem)]">

        <DropdownMenuItem
          onClick={() =>
            setCriteriaDialogTask({
              id: main.id,
              description: main.task_description,
              criteria: main.completion_criteria || undefined,
              taskType: "main",
            })
          }
          className="cursor-pointer"
        >
          <FileText className="h-4 w-4" />
          <span>{isArabic ? "معيار الإنجاز" : "Completion criteria"}</span>
        </DropdownMenuItem>

        {onUpdateTaskScheduleDays && (
          <>
            <div className="sm:hidden border-t border-border/60 my-1 pt-1">
              <TaskScheduleDaysPicker
                taskId={main.id}
                scheduleDays={main.schedule_days}
                isArabic={isArabic}
                onUpdateScheduleDays={onUpdateTaskScheduleDays}
              />
            </div>
            <div className="hidden sm:block">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>{isArabic ? "أيام التكرار" : "Repeat Days"}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-1 w-68 bg-card border border-border/80 shadow-xl rounded-xl">
                  <TaskScheduleDaysPicker
                    taskId={main.id}
                    scheduleDays={main.schedule_days}
                    isArabic={isArabic}
                    onUpdateScheduleDays={onUpdateTaskScheduleDays}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </div>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onMoveMain(main.id, "up")}
          disabled={mainIdx === 0}
          className="cursor-pointer"
        >
          <ChevronUp className="h-4 w-4" />
          <span>{isArabic ? "تحريك للأعلى" : "Move up"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onMoveMain(main.id, "down")}
          disabled={mainIdx === totalMains - 1}
          className="cursor-pointer"
        >
          <ChevronDown className="h-4 w-4" />
          <span>{isArabic ? "تحريك للأسفل" : "Move down"}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() =>
            onOpenTaskEditor({
              id: main.id,
              task_description: main.task_description,
              task_type: "main",
              frequency: main.frequency,
              impact_weight: main.impact_weight,
              time_required_minutes: main.time_required_minutes,
              completion_criteria: main.completion_criteria,
              icon: main.icon,
            })
          }
          className="cursor-pointer"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>{isArabic ? "تعديل المهمة" : "Edit task"}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
          {isArabic ? "الأهمية / الوزن:" : "Weight:"}
        </div>
        <div className="scrollbar-thin grid grid-cols-5 gap-1 px-2 pb-1 sm:flex sm:overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onUpdateTaskWeight(main.id, w)}
              className={cn(
                "h-8 w-full sm:h-7 sm:w-7 shrink-0 rounded-lg text-xs font-bold transition-colors touch-manipulation",
                main.impact_weight === w
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {w}
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() =>
            setTaskToDelete({
              id: main.id,
              description: main.task_description,
            })
          }
          variant="destructive"
          className="cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          <span>{t.deleteTask}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
