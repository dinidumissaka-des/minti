import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-control w-full rounded-lg border border-ink/10 bg-ink/5 px-4 py-2 text-base text-ink placeholder:text-muted transition-colors outline-none",
        "focus-visible:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(var(--background))] [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(var(--ink))]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
