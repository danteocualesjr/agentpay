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

export function IconCopy({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <path d="M4 2h7a1 1 0 011 1v1h1a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V9H4a1 1 0 01-1-1V3a1 1 0 011-1zm1 2v6h6V4H5zm2-2v1h5v6h1V3a1 1 0 00-1-1H7z" />
    </svg>
  );
}

export function IconEye({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 3C4.5 3 1.7 5.4.5 8c1.2 2.6 4 5 7.5 5s6.3-2.4 7.5-5C14.3 5.4 11.5 3 8 3zm0 2.2a2.8 2.8 0 110 5.6 2.8 2.8 0 010-5.6zM8 6a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

export function IconEyeOff({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M2.3 1.6L1 2.9l2.2 2.2A9.7 9.7 0 00.5 8c1.2 2.6 4 5 7.5 5 1.5 0 2.9-.4 4.1-1.1l2.4 2.4 1.3-1.3L2.3 1.6zM8 11.8c-1.8 0-3.4-.7-4.6-1.8l1.4-1.4a4.3 4.3 0 003.2 1.2 4.3 4.3 0 003.2-1.2l1.4 1.4A6.3 6.3 0 018 11.8zm5.7-3.3l-1.5-1.5a2.8 2.8 0 00-3.8-3.8L7.1 3.2A6.3 6.3 0 0115.5 8a6.1 6.1 0 01-1.8 3.5z" />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <path d="M3.5 3.5l9 9 1-1-9-9-1 1zm9 0l-9 9 1 1 9-9-1-1z" />
    </svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm0 1.5a5 5 0 110 10 5 5 0 010-10zm.75 2.5v3.1l2.5 1.5-.75 1.2-3-1.8V5.5h.75z" />
    </svg>
  );
}

export function IconDollar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1.5v1.3A3.5 3.5 0 0111.5 6.5h-1A2.5 2.5 0 008 4.3V7h3a3.5 3.5 0 010 7v1.2h-1.5V14H8v-1.3A3.5 3.5 0 014.5 9.5h1A2.5 2.5 0 008 11.7V9H5a3.5 3.5 0 010-7V.8h1.5V1.5H8zm0 5.5a2.5 2.5 0 000 5v-5zm0-4.2V7A2.5 2.5 0 008 4.8z" />
    </svg>
  );
}

export function IconAlert({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1.5l7 12.5H1L8 1.5zm0 3L3.6 12.5h8.8L8 4.5zM7.25 7h1.5v3.5h-1.5V7zm0 4.5h1.5V13h-1.5v-1.5z" />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M6 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2 13.5c0-2.2 1.8-4 4-4s4 1.8 4 4V15H2v-1.5zM11.5 8a2 2 0 100-4 2 2 0 000 4zM10 13.5c0-1.2.6-2.2 1.5-2.8A4.5 4.5 0 0010 9.5c-1.2 0-2.3.5-3.1 1.2.9.7 1.6 1.8 1.6 3.1V15h3v-1.5z" />
    </svg>
  );
}

export function IconBlock({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1.5a6.5 6.5 0 016.5 6.5v.5l-8-8A6.5 6.5 0 018 1.5zM1.5 8A6.5 6.5 0 008 14.5h.5l-8-8v-.5zM8 2.6L2.6 8A5 5 0 008 13.4 5 5 0 0013.4 8 5 5 0 008 2.6z" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <path d="M6.2 11.3L3.5 8.6l1-1 1.7 1.7 4.3-4.3 1 1-5.3 5.3z" />
    </svg>
  );
}
