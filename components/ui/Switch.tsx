"use client";

// Decorative: the row around it carries role="switch" and the tap target, so
// this is the picture of the state, not the control.
export default function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`w-11 h-6 shrink-0 rounded-full p-0.5 flex items-center transition-colors duration-fast ease-out ${
        on ? "bg-accent-fill" : "bg-ink/15"
      }`}
    >
      {/* The knob inverts with the track rather than staying white: a light
          knob on the brand green is 1.3:1 in light mode and disappears.
          --accent-on is the token for anything sitting on an accent fill. */}
      <span
        className={`w-5 h-5 rounded-full transition-[transform,background-color] duration-fast ease-out ${
          on ? "translate-x-5 bg-accent-on" : "translate-x-0 bg-ink/60"
        }`}
      />
    </span>
  );
}
