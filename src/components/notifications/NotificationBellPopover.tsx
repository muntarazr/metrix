"use client";

import { useState } from "react";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Flame,
  Trophy,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Clock,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SmartNotification, HabitState } from "@/hooks/useSmartNotifications";

interface NotificationBellPopoverProps {
  notifications: SmartNotification[];
  unreadCount: number;
  highPriorityCount: number;
  isArabic?: boolean;
  onSelectGoal?: (goalId: string) => void;
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: SmartNotification) => void;
}

export default function NotificationBellPopover({
  notifications,
  unreadCount,
  highPriorityCount,
  isArabic = true,
  onSelectGoal,
  onMarkAllAsRead,
  onNotificationClick,
}: NotificationBellPopoverProps) {
  const [open, setOpen] = useState(false);

  const getIcon = (type: SmartNotification["type"]) => {
    switch (type) {
      case "streak_rescue":
        return <Flame className="h-4 w-4 text-destructive" />;
      case "comeback_welcome":
        return <Sparkles className="h-4 w-4 text-amber-500" />;
      case "milestone_celebration":
        return <Trophy className="h-4 w-4 text-primary" />;
      case "consistency_boost":
        return <CheckCheck className="h-4 w-4 text-emerald-500" />;
      default:
        return <Bell className="h-4 w-4 text-foreground/70" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-border/60 bg-card/80 text-muted-foreground shadow-2xs backdrop-blur-sm transition-all duration-200 hover:bg-muted/60 hover:text-foreground active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            highPriorityCount > 0 && "border-destructive/40 text-foreground"
          )}
          aria-label={isArabic ? "الإشعارات" : "Notifications"}
        >
          <Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />

          {/* Unread dot or counter badge */}
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-white shadow-sm ring-2 ring-background",
                highPriorityCount > 0
                  ? "bg-destructive animate-pulse"
                  : "bg-primary"
              )}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={isArabic ? "start" : "end"}
        sideOffset={8}
        className="w-[320px] sm:w-[380px] p-0 rounded-2xl border-border/80 bg-card/95 shadow-xl backdrop-blur-md overflow-hidden"
        dir={isArabic ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">
              {isArabic ? "الإشعارات الذكية" : "Smart Notifications"}
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {unreadCount} {isArabic ? "جديد" : "new"}
              </span>
            )}
          </div>

          {notifications.length > 0 && onMarkAllAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 rounded-lg"
            >
              <CheckCheck className="h-3 w-3" />
              <span>{isArabic ? "تحديد كمقروء" : "Mark read"}</span>
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40 scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center text-muted-foreground/75">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-muted/20">
                <CheckCheck className="h-5 w-5 opacity-60 text-emerald-500" />
              </div>
              <p className="text-xs font-semibold text-foreground/80">
                {isArabic ? "أنت مواكب لكل شيء!" : "You're all caught up!"}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-[200px]">
                {isArabic
                  ? "لا توجد تنبيهات طارئة، استمر على هذا الزخم الممتاز."
                  : "No urgent alerts. Keep up the solid momentum."}
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const isHigh = n.priority === "high";

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    onNotificationClick?.(n);
                    if (n.goalId && onSelectGoal) {
                      onSelectGoal(n.goalId);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-start",
                    isHigh
                      ? "bg-destructive/6 hover:bg-destructive/10"
                      : "hover:bg-muted/40"
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-background shadow-2xs mt-0.5",
                      isHigh
                        ? "border-destructive/30"
                        : "border-border/70"
                    )}
                  >
                    {getIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={cn(
                          "text-xs font-bold truncate",
                          isHigh ? "text-destructive" : "text-foreground"
                        )}
                      >
                        {n.title}
                      </p>
                      {n.goalTitle && (
                        <span className="text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.2 rounded border border-border/50 shrink-0 truncate max-w-[90px]">
                          {n.goalTitle}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground group-hover:text-foreground/90 transition-colors">
                      {n.message}
                    </p>
                  </div>

                  {/* Chevron / Action Indicator */}
                  <div className="shrink-0 self-center text-muted-foreground/40 group-hover:text-foreground/70 transition-colors">
                    {isArabic ? (
                      <ArrowLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
