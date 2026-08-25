import { cn } from "@/lib/utils";

export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-accent", className)}
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth="19.9">
        <path d="M54.93 14.55A29.3 29.3 0 1 0 68.41 35.32" />
        <path d="M45.07 85.45A29.3 29.3 0 1 0 31.59 64.68" />
      </g>
    </svg>
  );
}
