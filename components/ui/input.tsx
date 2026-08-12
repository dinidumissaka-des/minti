import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-control w-full rounded-xl border border-ink/10 bg-ink/5 backdrop-blur-md px-4 py-2 text-base text-ink placeholder:text-muted transition-colors outline-none",
        "focus-visible:border-accent-fill focus-visible:ring-2 focus-visible:ring-accent-fill/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(var(--background))] [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(var(--ink))]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
