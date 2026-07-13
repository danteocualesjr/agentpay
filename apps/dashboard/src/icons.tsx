type IconProps = { className?: string };

export function IconHome({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width="15" height="15">
      <path d="M2 6.5L8 2l6 4.5V14H9.5v-4h-3v4H2V6.5z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAgents({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width="15" height="15">
      <rect x="3" y="4.5" width="10" height="8" rx="2" />
      <path d="M8 4.5V2M5.5 8.5h.01M10.5 8.5h.01M6 11h4" strokeLinecap="round" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width="15" height="15">
      <path d="M8 1.8L2.8 3.8v4c0 3 2.1 5.2 5.2 6.4 3.1-1.2 5.2-3.4 5.2-6.4v-4L8 1.8z" strokeLinejoin="round" />
      <path d="M5.8 8l1.6 1.6 2.8-2.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLedger({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width="15" height="15">
      <rect x="3" y="2" width="10" height="12" rx="1.5" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <path d="M5 3.2v9.6c0 .5.6.9 1 .6l7-4.8c.4-.3.4-.9 0-1.2l-7-4.8c-.4-.3-1 0-1 .6z" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width="14" height="14">
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2L14 14" strokeLinecap="round" />
    </svg>
  );
}

export function IconRefresh({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width="14" height="14">
      <path d="M13.5 8a5.5 5.5 0 11-1.6-3.9M13.5 2v2.5H11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrowUpRight({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width="13" height="13">
      <path d="M4.5 11.5l7-7M6 4.5h5.5V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLogo({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 28 28" width="26" height="26">
      <defs>
        <linearGradient id="ap-mark" x1="0" y1="0" x2="28" y2="28">
          <stop stopColor="#5eead4" />
          <stop offset="0.5" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8" fill="url(#ap-mark)" fillOpacity="0.14" stroke="url(#ap-mark)" strokeWidth="1.2" />
      <path
        d="M14 6.5l-5 2v3.2c0 2.9 2 5.1 5 6.3 3-1.2 5-3.4 5-6.3V8.5l-5-2z"
        fill="none"
        stroke="url(#ap-mark)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M11.8 11.6l1.7 1.7 3-3.1" fill="none" stroke="url(#ap-mark)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
