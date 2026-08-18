export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-label="Fleet Tracker logo"
      role="img"
    >
      <path
        d="M16 3C10.4 3 6 7.35 6 12.86C6 20.2 16 29 16 29C16 29 26 20.2 26 12.86C26 7.35 21.6 3 16 3Z"
        fill="currentColor"
        className="text-primary"
      />
      <path
        d="M10.8 14.6L14.6 10.8L17.3 13.3L21.2 9.2"
        stroke="hsl(var(--sidebar))"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.9 9.2H21.2V12.6"
        stroke="hsl(var(--sidebar))"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
