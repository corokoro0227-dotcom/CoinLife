type IconProps = { className?: string };

const base = {
  viewBox: "0 0 40 40",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true as const,
};

// A wallet with a check — "your funds stay yours, nothing is custodied."
export function IconWallet({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="10" width="28" height="22" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 16H32" stroke="currentColor" strokeWidth="1.75" />
      <rect x="24" y="19" width="12" height="8" stroke="currentColor" strokeWidth="1.75" className="fill-background" />
      <circle cx="28" cy="23" r="1.4" fill="currentColor" />
      <path d="M12 6H28" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
    </svg>
  );
}

// A repeating cycle arrow — the entry → contest → entry rhythm.
export function IconCycle({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="M9 14C9 9 13.5 6 20 6C27 6 31 10 32 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
      <path d="M32 15L32 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
      <path d="M32 15L25 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
      <path
        d="M31 26C31 31 26.5 34 20 34C13 34 9 30 8 25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
      <path d="M8 25L8 32" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
      <path d="M8 25L15 27" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
    </svg>
  );
}

// A sprouting seedling — starting small.
export function IconSeedling({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 34V20" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M20 20C20 20 8 20 8 10C18 10 20 18 20 20Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M20 24C20 24 32 24 32 14C22 14 20 22 20 24Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9 34H31" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
    </svg>
  );
}

// Stacked, growing bars — accumulated track record.
export function IconStack({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="6" y="22" width="7" height="12" stroke="currentColor" strokeWidth="1.75" />
      <rect x="16.5" y="14" width="7" height="20" stroke="currentColor" strokeWidth="1.75" />
      <rect x="27" y="6" width="7" height="28" fill="currentColor" className="text-accent" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

// A simple globe — world news.
export function IconGlobe({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="1.75" />
      <ellipse cx="20" cy="20" rx="6" ry="14" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6 20H34" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8.5 12.5H31.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8.5 27.5H31.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

// A shield with a check — non-custodial safety, used on the homepage feature row.
export function IconShield({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 5L33 10V19C33 27 27.5 32.5 20 35C12.5 32.5 7 27 7 19V10L20 5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M13.5 20L18 24.5L27 14.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="round" />
    </svg>
  );
}

// A balance scale — fair judging.
export function IconScale({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 6V34" stroke="currentColor" strokeWidth="1.75" />
      <path d="M11 34H29" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
      <path d="M6 12H34" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
      <path d="M6 12L10 20H2L6 12Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M34 12L38 20H30L34 12Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

// An ascending arrow with a dot — pure track-record performance.
export function IconTrend({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 28L15 19L21 24L34 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="round" />
      <path d="M26 10H34V18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="round" />
    </svg>
  );
}

// An empty tray with a dashed line — reusable "nothing here yet" state.
export function IconEmptyTray({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 20L10 8H30L34 20" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M6 20V32H34V20" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M6 20H15L17 24H23L25 20H34" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}
