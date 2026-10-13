export const STORAGE_KEY_TIMER = "metrix_focus_mode_state";
export const STORAGE_KEY_ZOOM = "metrix_focus_zoom_level";

export const MAX_ZOOM = 4;
export const MAX_HOURS = 12;

export const TIMER_FONT_SIZES = [
  "text-2xl min-[380px]:text-3xl sm:text-4xl md:text-5xl",                  // Step 1 (Index 0): Compact
  "text-3xl min-[380px]:text-4xl sm:text-5xl md:text-6xl",                  // Step 2 (Index 1): Standard (Default)
  "text-4xl min-[380px]:text-5xl sm:text-6xl md:text-7xl",                  // Step 3 (Index 2): Medium-Large
  "text-[2.75rem] min-[380px]:text-6xl sm:text-7xl md:text-8xl",            // Step 4 (Index 3): Large
  "text-5xl min-[380px]:text-6xl sm:text-8xl md:text-9xl lg:text-[9.5rem]", // Step 5 (Index 4): Hero Giant
];

export const INPUT_WIDTHS = [
  "w-12 min-[380px]:w-16 sm:w-20 md:w-24",
  "w-16 min-[380px]:w-20 sm:w-24 md:w-28",
  "w-20 min-[380px]:w-24 sm:w-28 md:w-36",
  "w-24 min-[380px]:w-28 sm:w-36 md:w-44",
  "w-28 min-[380px]:w-32 sm:w-48 md:w-60 lg:w-72",
];
