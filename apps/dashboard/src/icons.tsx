type IconProps = { className?: string };

export function IconHome({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1.5L1 7v7.5h4.5V10h5v4.5H15V7L8 1.5z" />
    </svg>
  );
}

export function IconAgents({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4V15H3v-1.5zM12 7a2 2 0 110 4h-1.1a3.5 3.5 0 00-2.4 1A3.5 3.5 0 0012 7z" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1L2 3.5v4.5c0 3.2 2.5 5.8 6 6.9 3.5-1.1 6-3.7 6-6.9V3.5L8 1zm0 1.6l4.5 1.8v3.6c0 2.4-1.8 4.4-4.5 5.4-2.7-1-4.5-3-4.5-5.4V4.4L8 2.6zM7 9.5l-1.5-1.5L7 6.5l3 3-5 5-1.4-1.4 3.6-3.6z" />
    </svg>
  );
}

export function IconLedger({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M3 1h10a1 1 0 011 1v12a1 1 0 01-1.4.9L8 13.5l-4.6 1.4A1 1 0 012 14V2a1 1 0 011-1zm1 2v9.3l3.6-1.1L11 12.3V3H4zm1.5 2h5v1h-5V5zm0 2h4v1h-4V7zm0 2h3v1h-3V9z" />
    </svg>
  );
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M4 2.5v11l9-5.5-9-5.5z" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M7 2a5 5 0 104.47 7.27l2.83 2.83 1.06-1.06-2.83-2.83A5 5 0 007 2zm0 2a3 3 0 110 6 3 3 0 010-6z" />
    </svg>
  );
}

export function IconRefresh({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M13.5 4.5A5.5 5.5 0 002.8 9H1l3 3 3-3H5.2a3.5 3.5 0 016.1-2.5L13.5 4.5zM2.5 11.5A5.5 5.5 0 0013.2 7H15l-3-3-3 3h1.8a3.5 3.5 0 00-6.1 2.5L2.5 11.5z" />
    </svg>
  );
}

export function IconLogout({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3v-1.5H3V3.5h3V2zm7.4 3.1L12.3 6.2l1.8 1.8H6v1.5h8.1l-1.8 1.8 1.1 1.1 3.5-3.5-3.5-3.5z" />
    </svg>
  );
}

export function IconEmpty({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" width="48" height="48">
      <rect x="8" y="12" width="32" height="28" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path d="M16 22h16M16 28h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <circle cx="24" cy="8" r="4" stroke="currentColor" strokeWidth="2" opacity="0.25" />
    </svg>
  );
}

export function IconLogo({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 28 28" width="28" height="28">
      <rect width="28" height="28" rx="7" fill="url(#ap-gradient)" />
      <path
        d="M14 6l-6 2.5v3.8c0 2.8 2.2 5.1 6 6.2 3.8-1.1 6-3.4 6-6.2V8.5L14 6zm0 2.2l3.5 1.4v2.9c0 1.6-1.2 3-3.5 3.8-2.3-.8-3.5-2.2-3.5-3.8V9.6L14 8.2zM11 13.5l1.8 1.8L17 11l1 1-4.2 4.2-2.8-2.8 1-1z"
        fill="white"
      />
      <defs>
        <linearGradient id="ap-gradient" x1="0" y1="0" x2="28" y2="28">
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
