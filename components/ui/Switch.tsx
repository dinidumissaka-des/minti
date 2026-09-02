"use client";

interface Props {
  on: boolean;
  /** Drawn inside the knob. Both or neither. */
  onIcon?: React.ReactNode;
  offIcon?: React.ReactNode;
}

// Decorative: the row around it carries role="switch" and the tap target, so
// this is the picture of the state, not the control.
export default function Switch({ on, onIcon, offIcon }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`w-11 h-6 shrink-0 rounded-full p-0.5 flex items-center transition-colors duration-fast ease-out ${
        on ? "bg-accent-fill" : "bg-ink/15"
      }`}
    >
      {/* The knob inverts with the track rather than staying white: a light
          knob on the brand green is 1.3:1 in light mode and disappears. On the
          green it takes --accent-on and marks itself in the green back again;
          off, it is an ink fill and marks itself in the page ground, which is
          the one token that flips with the theme the way the ink does. */}
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center transition-[transform,background-color] duration-fast ease-out ${
          on ? "translate-x-5 bg-accent-on text-accent-fill" : "translate-x-0 bg-ink/60 text-background"
        }`}
      >
        {on ? onIcon : offIcon}
      </span>
    </span>
  );
}
