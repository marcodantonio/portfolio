import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariantClasses = {
  default: "ds-btn--default",
  outline: "ds-btn--outline",
  secondary: "ds-btn--secondary",
  ghost: "ds-btn--ghost",
  destructive: "ds-btn--destructive",
  link: "ds-btn--link",
} as const;

const buttonSizeClasses = {
  default: "ds-btn--size-default",
  xs: "ds-btn--size-xs",
  sm: "ds-btn--size-sm",
  lg: "ds-btn--size-lg",
  icon: "ds-btn--size-icon",
  "icon-xs": "ds-btn--size-icon-xs",
  "icon-sm": "ds-btn--size-icon-sm",
  "icon-lg": "ds-btn--size-icon-lg",
} as const;

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: keyof typeof buttonVariantClasses
  size?: keyof typeof buttonSizeClasses
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "button"
  const dsVariantClass = buttonVariantClasses[variant]
  const dsSizeClass = buttonSizeClasses[size]

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn("ds-btn", dsVariantClass, dsSizeClass, className)}
      {...props}
    />
  )
}

export { Button }
