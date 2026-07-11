// Built-in "preset" avatars: a gradient disc with the user's initials, stored as
// an inline SVG data URI in the same avatar_url field (no schema change, renders
// straight into the <img> Avatar). Users can pick one instead of uploading a photo.

export interface AvatarPreset {
  id: string;
  from: string;
  to: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "indigo", from: "#6366f1", to: "#4338ca" },
  { id: "emerald", from: "#10b981", to: "#047857" },
  { id: "rose", from: "#f43f5e", to: "#be123c" },
  { id: "amber", from: "#f59e0b", to: "#b45309" },
  { id: "sky", from: "#0ea5e9", to: "#0369a1" },
  { id: "violet", from: "#8b5cf6", to: "#6d28d9" },
  { id: "teal", from: "#14b8a6", to: "#0f766e" },
  { id: "slate", from: "#64748b", to: "#334155" },
];

/** First letters of the name (up to 2), uppercased — matches the header fallback. */
export function initialsOf(name: string): string {
  const s = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return s || "?";
}

/** An SVG data URI: a diagonal gradient disc with centred initials. */
export function presetAvatarDataUri(initials: string, from: string, to: string): string {
  const safe = initials.replace(/[<>&]/g, "");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="128" height="128" rx="64" fill="url(#g)"/>` +
    `<text x="64" y="64" dy="0.35em" text-anchor="middle" ` +
    `font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="#ffffff">${safe}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
