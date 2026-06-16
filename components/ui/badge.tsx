import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariantClasses = {
  default: "ds-badge--default",
  secondary: "ds-badge--secondary",
  destructive: "ds-badge--destructive",
  outline: "ds-badge--outline",
  ghost: "ds-badge--ghost",
  link: "ds-badge--link",
} as const;

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & {
  variant?: keyof typeof badgeVariantClasses
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "span"
  const dsVariantClass = badgeVariantClasses[variant]

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn("ds-badge", dsVariantClass, className)}
      {...props}
    />
  )
}

export { Badge }
