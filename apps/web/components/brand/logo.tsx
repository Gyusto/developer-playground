import { cn } from "@/lib/utils";

/**
 * Developer Playground brand mark.
 *
 * A rounded gradient badge holding API angle-brackets `‹ ›` that frame a
 * lightning bolt — "dynamic" (bolt) + "API / code" (brackets) in one glyph.
 */
export function LogoMark({
  size = 32,
  className,
  gradientId = "dp-logo-gradient",
}: {
  size?: number;
  className?: string;
  gradientId?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Developer Playground"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      {/* API angle brackets */}
      <g
        stroke="#FFFFFF"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.92"
      >
        <path d="M11 10.5 6.5 16 11 21.5" />
        <path d="M21 10.5 25.5 16 21 21.5" />
      </g>
      {/* lightning bolt */}
      <path
        d="M17.7 7.5 12.8 16.7h3.05l-1.55 7.8 5.4-9.9h-3.05z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Full lockup: mark + wordmark. */
export function Logo({
  size = 32,
  className,
  textClassName,
  gradientId,
}: {
  size?: number;
  className?: string;
  textClassName?: string;
  gradientId?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} gradientId={gradientId} />
      <span className={cn("font-semibold tracking-tight", textClassName)}>Developer Playground</span>
    </span>
  );
}
