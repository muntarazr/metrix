import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border-2 border-transparent px-2.5 py-0.5 text-xs font-bold tracking-wide w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/25 dark:aria-invalid:ring-destructive/45 aria-invalid:border-destructive transition-all overflow-hidden shadow-xs",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-primary/40 [a&]:hover:brightness-105",
        secondary:
          "bg-secondary text-secondary-foreground border-border [a&]:hover:bg-secondary/80",
        destructive:
          "bg-destructive text-white border-destructive/40 [a&]:hover:brightness-105",
        outline:
          "border-2 border-border bg-card text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground border-transparent",
        link: "text-primary underline-offset-4 [a&]:hover:underline border-transparent shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
