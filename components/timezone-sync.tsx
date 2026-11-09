"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { updateTimezone } from "@/actions/settings";

/**
 * Rendered only while the signed-in user has no saved timezone: saves the
 * browser's timezone once (never overrides one already set in Settings).
 */
export function TimezoneSync() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    updateTimezone(tz, { onlyIfUnset: true })
      .then(() => router.refresh())
      .catch((err) => console.error("Failed to save timezone", err));
  }, [router]);

  return null;
}
