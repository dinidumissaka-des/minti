"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";

// Google fills these in on OAuth sign-in; email/password accounts have neither,
// which is what the initials are for.
export function displayName(user: User | null | undefined): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const named = (meta.full_name ?? meta.name) as string | undefined;
  return named?.trim() || user?.email?.split("@")[0] || "You";
}

export function avatarUrl(user: User | null | undefined): string | undefined {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return (meta.avatar_url ?? meta.picture) as string | undefined;
}

export function initials(user: User | null | undefined): string {
  const parts = displayName(user).split(/[\s._-]+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0]?.slice(0, 2) ?? "?";
  return letters.toUpperCase();
}

interface Props {
  user: User | null | undefined;
  size?: number;
  className?: string;
}

export default function Avatar({ user, size = 40, className = "" }: Props) {
  const url = avatarUrl(user);
  const [failed, setFailed] = useState(false);

  return (
    <span
      style={{ width: size, height: size }}
      className={`shrink-0 inline-flex items-center justify-center overflow-hidden rounded-full bg-ink/10 font-sans font-semibold text-ink ${className}`}
    >
      {url && !failed ? (
        // A plain img, not next/image: the mobile target is a static export
        // with no image optimiser behind it.
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.36) }}>{initials(user)}</span>
      )}
    </span>
  );
}
