// A rising price chart paired with a large coin — no figures, just the
// market itself. Flat geometric shapes and line work only, filling the
// frame with minimal margin. No gradients, no glow, no photography.
export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 420 320"
      className="h-auto w-full max-w-md text-zinc-900 dark:text-zinc-100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* chart grid */}
      <path d="M8 88H236" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" strokeLinecap="round" />
      <path d="M8 150H236" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" strokeLinecap="round" />
      <path d="M8 212H236" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" strokeLinecap="round" />
      <path d="M8 272H236" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* candlesticks trending up */}
      <line x1="28" y1="248" x2="28" y2="224" stroke="currentColor" strokeWidth="2" />
      <rect x="21" y="228" width="14" height="14" stroke="currentColor" strokeWidth="1.75" className="fill-background" />
      <line x1="52" y1="240" x2="52" y2="206" stroke="currentColor" strokeWidth="2" />
      <rect x="45" y="210" width="14" height="16" className="fill-accent" />
      <line x1="76" y1="232" x2="76" y2="200" stroke="currentColor" strokeWidth="2" />
      <rect x="69" y="204" width="14" height="14" stroke="currentColor" strokeWidth="1.75" className="fill-background" />
      <line x1="100" y1="216" x2="100" y2="180" stroke="currentColor" strokeWidth="2" />
      <rect x="93" y="184" width="14" height="18" className="fill-accent" />
      <line x1="124" y1="198" x2="124" y2="164" stroke="currentColor" strokeWidth="2" />
      <rect x="117" y="168" width="14" height="16" className="fill-accent" />
      <line x1="148" y1="182" x2="148" y2="148" stroke="currentColor" strokeWidth="2" />
      <rect x="141" y="152" width="14" height="16" className="fill-accent" />
      <line x1="172" y1="162" x2="172" y2="126" stroke="currentColor" strokeWidth="2" />
      <rect x="165" y="130" width="14" height="16" className="fill-accent" />
      <line x1="196" y1="142" x2="196" y2="104" stroke="currentColor" strokeWidth="2" />
      <rect x="189" y="108" width="14" height="18" className="fill-accent" />

      {/* trend line reaching toward the coin */}
      <path
        d="M28 234L52 210L76 210L100 184L124 168L148 152L172 130L196 108L218 84"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="218" cy="84" r="4.5" fill="currentColor" />

      {/* large coin, bitcoin-like */}
      <circle cx="310" cy="140" r="100" stroke="currentColor" strokeWidth="3" className="fill-background" />
      <path d="M310 92V188" strokeWidth="9" strokeLinecap="round" className="stroke-accent" />
      <path
        d="M310 98C338 98 338 138 310 138"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-accent"
      />
      <path
        d="M310 138C342 138 342 182 310 182"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-accent"
      />
      <path d="M300 76V100" strokeWidth="7" strokeLinecap="round" className="stroke-accent" />
      <path d="M320 76V100" strokeWidth="7" strokeLinecap="round" className="stroke-accent" />
      <path d="M300 180V204" strokeWidth="7" strokeLinecap="round" className="stroke-accent" />
      <path d="M320 180V204" strokeWidth="7" strokeLinecap="round" className="stroke-accent" />

      {/* small coin, faceted */}
      <path d="M64 204L98 258L64 312L30 258Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="fill-background" />
      <path d="M30 258L64 240L98 258" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M30 258L64 276L98 258" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />

      {/* small coin, plain */}
      <circle cx="380" cy="64" r="16" className="fill-accent" />
      <circle cx="380" cy="64" r="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
