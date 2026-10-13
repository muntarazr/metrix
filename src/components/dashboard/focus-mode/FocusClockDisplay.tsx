"use client";

import { cn } from "@/lib/utils";
import { MAX_HOURS } from "./focus-constants";

interface FocusClockDisplayProps {
  isRunning: boolean;
  hasHours: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  currentFontSize: string;
  currentInputWidth: string;
  isArabic: boolean;
  isEditingHours: boolean;
  isEditingMinutes: boolean;
  hoursInput: string;
  minutesInput: string;
  setHoursInput: (val: string | ((prev: string) => string)) => void;
  setMinutesInput: (val: string | ((prev: string) => string)) => void;
  setIsEditingHours: (val: boolean) => void;
  setIsEditingMinutes: (val: boolean) => void;
  handleIncrementHours: (delta: number) => void;
  handleIncrementMinutes: (delta: number) => void;
  handleCommitHours: (val: string) => void;
  handleCommitMinutes: (val: string) => void;
}

export function FocusClockDisplay({
  isRunning,
  hasHours,
  hours,
  minutes,
  seconds,
  currentFontSize,
  currentInputWidth,
  isArabic,
  isEditingHours,
  isEditingMinutes,
  hoursInput,
  minutesInput,
  setHoursInput,
  setMinutesInput,
  setIsEditingHours,
  setIsEditingMinutes,
  handleIncrementHours,
  handleIncrementMinutes,
  handleCommitHours,
  handleCommitMinutes,
}: FocusClockDisplayProps) {
  return (
    <div className="flex flex-col items-center select-none w-full" dir="ltr">
      {isRunning ? (
        /* Running Mode: Peaceful countdown with ticking seconds (Pure typography without boxes) */
        <div className="flex items-center justify-center gap-1 sm:gap-3 flex-nowrap whitespace-nowrap max-w-full">
          {hasHours && (
            <>
              <span
                className={cn(
                  "font-mono font-black text-foreground tabular-nums tracking-tighter select-none transition-all duration-300",
                  currentFontSize,
                )}
              >
                {String(hours).padStart(2, "0")}
              </span>

              <span
                className={cn(
                  "font-mono font-black text-foreground/30 select-none transition-all duration-300",
                  currentFontSize,
                )}
              >
                :
              </span>
            </>
          )}

          {/* Minutes Column */}
          <span
            className={cn(
              "font-mono font-black text-foreground tabular-nums tracking-tighter select-none transition-all duration-300",
              currentFontSize,
            )}
          >
            {String(minutes).padStart(2, "0")}
          </span>

          <span
            className={cn(
              "font-mono font-black text-foreground/30 select-none transition-all duration-300",
              currentFontSize,
            )}
          >
            :
          </span>

          {/* Seconds Column */}
          <span
            className={cn(
              "font-mono font-black text-foreground tabular-nums tracking-tighter select-none transition-all duration-300",
              currentFontSize,
            )}
          >
            {String(seconds).padStart(2, "0")}
          </span>
        </div>
      ) : (
        /* Setup / Idle Mode: Pure digital numbers without background box, click to edit or scroll */
        <div className="flex items-center justify-center gap-1 sm:gap-3 flex-nowrap whitespace-nowrap max-w-full">
          {/* Hours Column (0 to 12 hours) */}
          <div
            onClick={() => {
              setHoursInput(String(hours));
              setIsEditingHours(true);
            }}
            onWheel={(e) => {
              e.preventDefault();
              handleIncrementHours(e.deltaY < 0 ? 1 : -1);
            }}
            className="relative flex items-center justify-center cursor-pointer select-none"
            title={
              isArabic
                ? `انقر لكتابة الساعات (0-${MAX_HOURS})، أو مرّر بعجلة الفأرة`
                : `Click to type hours (0-${MAX_HOURS}), or scroll with mouse wheel`
            }
          >
            {isEditingHours ? (
              <input
                type="number"
                min="0"
                max={MAX_HOURS}
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                onBlur={() => handleCommitHours(hoursInput)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommitHours(hoursInput);
                  if (e.key === "Escape") setIsEditingHours(false);
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHoursInput((prev) =>
                      String(
                        Math.min(
                          MAX_HOURS,
                          (parseInt(prev, 10) || 0) + 1,
                        ),
                      ),
                    );
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHoursInput((prev) =>
                      String(
                        Math.max(0, (parseInt(prev, 10) || 0) - 1),
                      ),
                    );
                  }
                }}
                autoFocus
                className={cn(
                  "text-center bg-transparent font-mono font-black text-foreground outline-none border-b-2 border-primary transition-all duration-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  currentFontSize,
                  currentInputWidth,
                )}
              />
            ) : (
              <span
                className={cn(
                  "font-mono font-black text-foreground tabular-nums tracking-tighter hover:text-primary transition-all duration-300",
                  currentFontSize,
                )}
              >
                {String(hours).padStart(2, "0")}
              </span>
            )}
          </div>

          {/* Static Separator */}
          <span
            className={cn(
              "font-mono font-black text-foreground/30 select-none transition-all duration-300",
              currentFontSize,
            )}
          >
            :
          </span>

          {/* Minutes Column (0 to 59 minutes) */}
          <div
            onClick={() => {
              setMinutesInput(String(minutes));
              setIsEditingMinutes(true);
            }}
            onWheel={(e) => {
              e.preventDefault();
              handleIncrementMinutes(e.deltaY < 0 ? 5 : -5);
            }}
            className="relative flex items-center justify-center cursor-pointer select-none"
            title={
              isArabic
                ? "انقر لكتابة الدقائق (0-59)، أو مرّر بعجلة الفأرة"
                : "Click to type minutes (0-59), or scroll with mouse wheel"
            }
          >
            {isEditingMinutes ? (
              <input
                type="number"
                min="0"
                max={59}
                value={minutesInput}
                onChange={(e) => setMinutesInput(e.target.value)}
                onBlur={() => handleCommitMinutes(minutesInput)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleCommitMinutes(minutesInput);
                  if (e.key === "Escape") setIsEditingMinutes(false);
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setMinutesInput((prev) =>
                      String(
                        Math.min(
                          59,
                          (parseInt(prev, 10) || 0) + 1,
                        ),
                      ),
                    );
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setMinutesInput((prev) =>
                      String(
                        Math.max(0, (parseInt(prev, 10) || 0) - 1),
                      ),
                    );
                  }
                }}
                autoFocus
                className={cn(
                  "text-center bg-transparent font-mono font-black text-foreground outline-none border-b-2 border-primary transition-all duration-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  currentFontSize,
                  currentInputWidth,
                )}
              />
            ) : (
              <span
                className={cn(
                  "font-mono font-black text-foreground tabular-nums tracking-tighter hover:text-primary transition-all duration-300",
                  currentFontSize,
                )}
              >
                {String(minutes).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
