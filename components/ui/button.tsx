import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center font-semibold transition-all duration-fast ease-out active:scale-[0.98] rounded-full whitespace-nowrap select-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  {
    variants: {
      variant: {
        default:     "bg-accent-fill text-accent-on hover:bg-accent-fill/85",
        secondary:   "bg-ink text-primary shadow-sm hover:bg-ink/85",
        outline:     "border-2 border-accent text-accent bg-transparent hover:bg-accent/10",
        ghost:       "text-accent bg-transparent hover:bg-accent/10",
        destructive: "bg-danger-fill text-ink hover:bg-danger-fill/85",
        link:        "text-accent underline-offset-4 hover:underline rounded-none",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
