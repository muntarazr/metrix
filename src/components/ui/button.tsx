import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold tracking-wide transition-all duration-100 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 aria-invalid:ring-destructive/25 dark:aria-invalid:ring-destructive/45 aria-invalid:border-destructive select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_3px_0_0_color-mix(in_oklch,var(--primary)_70%,black)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_0_color-mix(in_oklch,var(--primary)_70%,black)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_3px_0_0_#991b1b] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_0_#991b1b]",
        outline:
          "border-2 border-border bg-card text-foreground shadow-[0_3px_0_0_var(--border)] hover:bg-accent hover:text-accent-foreground active:translate-y-[2px] active:shadow-[0_1px_0_0_var(--border)]",
        secondary:
          "bg-secondary text-secondary-foreground border-2 border-border/70 shadow-[0_3px_0_0_var(--border)] hover:bg-secondary/80 active:translate-y-[2px] active:shadow-[0_1px_0_0_var(--border)]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:translate-y-[1px]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-2xl px-6 text-base has-[>svg]:px-4",
        icon: "size-10 rounded-xl",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 rounded-xl",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }
>(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
