"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  AlertTriangle,
  Swords,
  Brain,
  Trophy,
  Lightbulb,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { NotificationType } from "@/hooks/useNotifications";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface NotificationItem {
  type: NotificationType;
  message: string;
}

interface NotificationsSectionProps {
  primaryGoal: {
    id: string;
    title: string;
    icon?: string;
  } | null;
  isArabic: boolean;
  notifications: NotificationItem[];
  notifLoading: boolean;
  notifError: string | null;
  contextReady: boolean;
  onRefresh: () => void;
  onNotificationClick?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Notification Meta (Icons & Colors)                                */
/* ------------------------------------------------------------------ */

const NOTIFICATION_META: Record<
  NotificationType,
  {
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    labelAr: string;
    labelEn: string;
  }
> = {
  streak_rescue: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/12",
    border: "border-destructive/25",
    labelAr: "سلسلة في خطر",
    labelEn: "Streak at risk",
  },
  challenge_alert: {
    icon: Swords,
    color: "text-foreground",
    bg: "bg-foreground/12",
    border: "border-foreground/25",
    labelAr: "تحدي",
    labelEn: "Challenge",
  },
  daily_focus: {
    icon: Brain,
    color: "text-foreground",
    bg: "bg-foreground/12",
    border: "border-foreground/25",
    labelAr: "تركيز يومي",
    labelEn: "Daily Focus",
  },
  milestone_celebration: {
    icon: Trophy,
    color: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/25",
    labelAr: "إنجاز",
    labelEn: "Milestone",
  },
  smart_push: {
    icon: Lightbulb,
    color: "text-foreground",
    bg: "bg-foreground/12",
    border: "border-foreground/25",
    labelAr: "دفعة ذكية",
    labelEn: "Smart Push",
  },
};



/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function NotificationCard({
  type,
  message,
  isArabic,
  onClick,
}: {
  type: NotificationType;
  message: string;
  isArabic: boolean;
  onClick?: () => void;
}) {
  const meta = NOTIFICATION_META[type];
  const Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-start transition-all duration-200 ease-out hover:shadow-sm hover:-translate-y-px active:translate-y-0",
        meta.bg,
        meta.border
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background",
          meta.border
        )}
      >
        <Icon className={cn("h-4 w-4", meta.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[11px] font-bold uppercase tracking-wider mb-1",
            meta.color
          )}
        >
          {isArabic ? meta.labelAr : meta.labelEn}
        </p>
        <p className="text-sm text-foreground/90 leading-relaxed">{message}</p>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export default function NotificationsSection({
  primaryGoal,
  isArabic,
  notifications,
  notifLoading,
  notifError,
  contextReady,
  onRefresh,
  onNotificationClick,
}: NotificationsSectionProps) {
  const [visibleNotifications, setVisibleNotifications] =
    useState<NotificationItem[]>(notifications);

  // Sync notifications from props
  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  const handleMarkAllRead = useCallback(() => {
    setVisibleNotifications([]);
  }, []);

  return (
    <div className="flex flex-col h-full w-full gap-3">
      <div className="flex w-full shrink-0 items-center">
        <div className="ms-auto flex items-center gap-1">
          {visibleNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isArabic ? "تحديد الكل كمقروء" : "Mark all as read"}
              </span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={notifLoading || !contextReady}
            className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", notifLoading && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      {!contextReady || notifLoading ? (
        <div className="space-y-2.5 animate-pulse">
          <div className="h-16 rounded-xl bg-muted/60" />
          <div className="h-16 rounded-xl bg-muted/60" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 scrollbar-thin">
          {visibleNotifications.length === 0 && !notifError && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground/75">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-muted/20">
                <CheckCheck className="h-5 w-5 opacity-50" />
              </div>
              <p className="text-sm font-medium">
                {isArabic
                  ? "لا توجد إشعارات حالياً"
                  : "No notifications right now"}
              </p>
            </div>
          )}
          {visibleNotifications.map((n, idx) => (
            <NotificationCard
              key={`${n.type}-${idx}`}
              type={n.type}
              message={n.message}
              isArabic={isArabic}
              onClick={onNotificationClick}
            />
          ))}
          {notifError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/12 border border-destructive/15 p-3 text-destructive text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>{notifError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
