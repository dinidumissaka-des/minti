"use client";

interface Props {
  /** Changing this replays the animation. */
  trigger: string;
  /** 1 = moving forward (content enters from the right), -1 = backward. */
  direction: number;
  children: React.ReactNode;
  className?: string;
}

// Remounts its subtree when `trigger` changes so the enter animation replays.
// Direction comes from the caller because only it knows whether the tab bar
// moved right or the month went back.
export default function ViewTransition({ trigger, direction, children, className = "" }: Props) {
  return (
    <div
      key={trigger}
      className={`${direction >= 0 ? "animate-view-in-fwd" : "animate-view-in-back"} ${className}`}
    >
      {children}
    </div>
  );
}
