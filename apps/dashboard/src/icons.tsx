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

export function IconCopy({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M4 2h7a1 1 0 011 1v1h1a1 1 0 011 1v7a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1V2zm1 2v7h7V5H5zm2-2h5v1H7V2z" />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M4.47 4.47a.75.75 0 011.06 0L8 6.94l2.47-2.47a.75.75 0 111.06 1.06L9.06 8l2.47 2.47a.75.75 0 11-1.06 1.06L8 9.06l-2.47 2.47a.75.75 0 11-1.06-1.06L6.94 8 4.47 5.53a.75.75 0 010-1.06z" />
    </svg>
  );
}

export function IconEye({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 3C4.5 3 1.73 5.11 1 8c.73 2.89 3.5 5 7 5s6.27-2.11 7-5c-.73-2.89-3.5-5-7-5zm0 8.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7zm0-1.5a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
  );
}

export function IconEyeOff({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M2.47 2.47a.75.75 0 011.06 0l10 10a.75.75 0 11-1.06 1.06l-1.47-1.47C9.82 12.7 8.92 13 8 13c-3.5 0-6.27-2.11-7-5 .28-1.12.9-2.14 1.78-2.94L2.47 3.53a.75.75 0 010-1.06zM8 4.5c.55 0 1.08.1 1.57.28L5.78 8.57A3.48 3.48 0 018 4.5zM8 11.5c3.5 0 6.27-2.11 7-5a6.2 6.2 0 00-1.5-2.12l-1.36 1.36A3.48 3.48 0 0111.5 8c0 1.93-1.57 3.5-3.5 3.5z" />
    </svg>
  );
}

export function IconMetricAgents({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
      <path d="M10 3a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM4 16.5c0-2.8 2.5-4.5 6-4.5s6 1.7 6 4.5V18H4v-1.5z" />
    </svg>
  );
}

export function IconMetricPending({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 110 12 6 6 0 010-12zm-.75 2.5v4.25l3.5 2.1.75-1.23-2.75-1.65V6.5h-1.5z" />
    </svg>
  );
}

export function IconMetricSpend({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
      <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm.75 3.5v2.69c1.48.35 2.75 1.61 2.75 3.31 0 1.8-1.46 3.25-3.25 3.25S7 13.3 7 11.5h1.5c0 1 0 1 1.75 1s1.75-.75 1.75-1.75-.75-1.75-1.75-1.75V5.5h1.5z" />
    </svg>
  );
}

export function IconMetricBlocked({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.03 4.97a.75.75 0 010 1.06L11.06 10l1.97 1.97a.75.75 0 11-1.06 1.06L10 11.06l-1.97 1.97a.75.75 0 11-1.06-1.06L8.94 10 6.97 8.03a.75.75 0 111.06-1.06L10 8.94l1.97-1.97a.75.75 0 011.06 0z" />
    </svg>
  );
}

export function IconHelp({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm0 1.5a5 5 0 110 10A5 5 0 018 3zM7.25 6v.5a.75.75 0 001.5 0V6c0-.69.56-1.25 1.25-1.25S11.25 5.31 11.25 6a.75.75 0 01-1.5 0c0-.14-.11-.25-.25-.25S9.25 5.86 9.25 6v.5a.75.75 0 001.5 0V6c0-.69.56-1.25 1.25-1.25S13.25 5.31 13.25 6c0 1.38-1.12 2.5-2.5 2.5a.75.75 0 00-.75.75V11a.75.75 0 001.5 0v-.75c1.38 0 2.5-1.12 2.5-2.5 0-1.38-1.12-2.5-2.5-2.5S7.25 4.62 7.25 6zM8 12.25a.875.875 0 100 1.75.875.875 0 000-1.75z" />
    </svg>
  );
}

export function IconDownload({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1.75a.75.75 0 01.75.75v5.19l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l1.72 1.72V2.5A.75.75 0 018 1.75zM3.5 11a.75.75 0 00-.75.75v1c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25v-1a.75.75 0 011.5 0v1A2.75 2.75 0 0112.5 14.5h-8.5A2.75 2.75 0 011.25 11.75v-1A.75.75 0 013.5 11z" />
    </svg>
  );
}

export function IconLogo({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 28 28" width="28" height="28">
      <rect width="28" height="28" rx="4" fill="url(#ap-gradient)" />
      <path
        d="M8 9h12v1.5H8V9zm0 4h12v1.5H8V13zm0 4h8v1.5H8V17z"
        fill="white"
      />
      <defs>
        <linearGradient id="ap-gradient" x1="0" y1="0" x2="28" y2="28">
          <stop stopColor="#0066ff" />
          <stop offset="1" stopColor="#003fa4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
