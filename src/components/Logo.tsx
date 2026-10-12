interface LogoProps {
  size?: number
  withWordmark?: boolean
  compact?: boolean
}

export function PakjaiMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Pakjai logo"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="pakjai-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2d6a4f" />
          <stop offset="1" stopColor="#1b4332" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#pakjai-g)" />
      <circle cx="45" cy="15" r="6" fill="#f4d166" />
      <circle cx="45" cy="15" r="8.5" fill="#f4d166" opacity="0.25" />
      <path
        d="M32 48 C22.5 40.5 15.5 34 15.5 25.8 C15.5 20 19.8 16.2 24.6 16.2 C28.2 16.2 30.9 18.5 32 21 C33.1 18.5 35.8 16.2 39.4 16.2 C44.2 16.2 48.5 20 48.5 25.8 C48.5 34 41.5 40.5 32 48 Z"
        fill="#faf9f5"
      />
      <path
        d="M32 21 L32 44"
        stroke="#52b788"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M32 29 L26.5 25.5 M32 29 L37.5 25.5 M32 35.5 L25.5 31.5 M32 35.5 L38.5 31.5"
        stroke="#52b788"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Logo({
  size = 36,
  withWordmark = true,
  compact = false,
}: LogoProps) {
  return (
    <span className="flex items-center gap-2.5 group">
      <span className="group-hover:scale-105 transition-transform duration-300 inline-flex shadow-sm rounded-[10px]">
        <PakjaiMark size={size} />
      </span>
      {withWordmark && (
        <span className="flex flex-col leading-none text-left">
          <span
            className="font-extrabold tracking-tight text-earth"
            style={{ fontSize: compact ? 17 : 20, lineHeight: 1, fontFamily: "'Lora', 'Sarabun', serif" }}
          >
            Pakjai
          </span>
          <span
            className="font-semibold text-earth-mid"
            style={{
              fontSize: compact ? 11 : 12,
              letterSpacing: "0.18em",
              marginTop: 3,
            }}
          >
            พักใจ
          </span>
        </span>
      )}
    </span>
  )
}
