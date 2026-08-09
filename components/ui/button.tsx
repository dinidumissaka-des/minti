import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center font-semibold transition-all rounded-full whitespace-nowrap select-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill/50",
  {
    variants: {
      variant: {
        default:     "bg-accent-fill text-[#163300] hover:bg-accent-fill/85",
        secondary:   "bg-ink text-primary shadow-sm hover:bg-ink/85",
        inverted:    "bg-primary text-ink hover:bg-primary/85",
        outline:     "border-2 border-primary text-primary bg-transparent hover:bg-primary/10",
        tertiary:    "bg-tertiary text-ink hover:bg-tertiary/85",
        ghost:       "text-primary bg-transparent hover:bg-primary/10",
        destructive: "bg-danger-fill text-ink hover:bg-danger-fill/85",
        link:        "text-primary underline-offset-4 hover:underline rounded-none",
      },
      size: {
        sm:        "h-9 px-5 text-sm",
        default:   "h-12 px-8 text-base",
        lg:        "h-14 px-10 text-lg",
        icon:      "size-12",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const sizeInnerClass: Record<string, string> = {
  sm:      "px-5 text-sm",
  default: "px-8 text-base",
  lg:      "px-10 text-lg",
  icon:    "",
  "icon-sm": "",
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, children, ...props }: ButtonProps) {
  const resolvedVariant = variant ?? "default";
  const resolvedSize = size ?? "default";

  if (resolvedVariant === "default") {
    return (
      <button
        data-slot="button"
        className={cn(
          "group relative inline-flex overflow-hidden rounded-full p-[1px]",
          "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(159,232,112,0.3)]",
          "disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill/50",
          resolvedSize === "sm" ? "h-9" : resolvedSize === "lg" ? "h-14" : "h-12",
          className
        )}
        {...props}
      >
        {/* Spinning shimmer border */}
        <span className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#ffffff_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {/* Accent bg overlay that hides shimmer when not hovered */}
        <span className="absolute inset-0 rounded-full bg-accent-fill transition-opacity duration-300 group-hover:opacity-0" />
        {/* Content with fluid glassy interior */}
        <span className={cn(
          "relative flex w-full h-full items-center justify-center gap-2 rounded-full font-semibold text-[#163300] whitespace-nowrap select-none overflow-hidden",
          "bg-[linear-gradient(135deg,#9FE870_0%,#c8f7a0_35%,#78d955_65%,#9FE870_100%)] bg-[length:250%_250%] animate-fluid-bg",
          sizeInnerClass[resolvedSize]
        )}>
          {/* Glass highlight sheen */}
          <span className="absolute inset-0 w-1/3 bg-[linear-gradient(105deg,transparent,rgba(255,255,255,0.45),transparent)] animate-glass-sheen pointer-events-none" />
          {/* Top glass reflection */}
          <span className="absolute inset-x-0 top-0 h-[45%] rounded-t-full bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,transparent_100%)] pointer-events-none" />
          <span className="relative z-10 flex items-center gap-2">{children}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
