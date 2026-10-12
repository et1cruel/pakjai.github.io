import { useState } from "react"
import { CategoryIcon } from "./icons"

const gradients = [
  "linear-gradient(135deg, #d8f3dc 0%, #f5f3ee 100%)",
  "linear-gradient(160deg, #ecf9ee 0%, #b7e4c7 100%)",
  "linear-gradient(120deg, #f5f3ee 0%, #cfe8d5 60%, #a8d5b5 100%)",
  "linear-gradient(200deg, #fef9e7 0%, #d8f3dc 100%)",
]
const hash = (s: string) =>
  [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7)

function Pattern({ kind }: { kind: number }) {
  const stroke = "rgba(45,106,79,0.16)"
  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke={stroke}
      strokeWidth="1.5"
    >
      {kind === 0 &&
        [30, 60, 90, 120, 150].map((r) => (
          <circle key={r} cx="320" cy="40" r={r} />
        ))}
      {kind === 1 &&
        [0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M-10 ${40 + i * 28} C 80 ${i * 28} 160 ${90 + i * 28} 260 ${50 + i * 28} S 380 ${20 + i * 28} 420 ${60 + i * 28}`}
          />
        ))}
      {kind === 2 &&
        [60, 170, 280, 360].map((x, i) => (
          <g key={x} transform={`translate(${x} ${i % 2 ? 90 : 30}) rotate(${i * 25 - 20})`}>
            <path d="M0 0 C 30 -30 60 0 0 60 C -60 0 -30 -30 0 0 Z" />
            <path d="M0 0 L0 60" />
          </g>
        ))}
      {kind === 3 && (
        <>
          <circle cx="80" cy="120" r="46" />
          <circle cx="80" cy="120" r="70" />
          <path d="M200 160 C 240 80 300 80 340 0" />
          <path d="M240 160 C 280 90 340 90 380 20" />
        </>
      )}
    </svg>
  )
}

export default function Cover({
  src,
  alt,
  category,
  seed,
  fill = false,
  className = "",
  imgClassName = "",
}: {
  src?: string
  alt: string
  category: string
  seed: string
  fill?: boolean
  className?: string
  imgClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  const h = hash(seed)
  const box = fill ? "absolute inset-0" : "relative"
  if (src && !failed)
    return (
      <div className={`${box} overflow-hidden bg-leaf ${className}`}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      </div>
    )
  return (
    <div
      role="img"
      aria-label={`ภาพประกอบหมวด${category}`}
      className={`${box} overflow-hidden ${className}`}
      style={{ background: gradients[h % gradients.length] }}
    >
      <Pattern kind={(h >> 3) % 4} />
      <span className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full bg-cream-card/80 text-forest shadow-organic backdrop-blur-sm">
        <CategoryIcon name={category} size={22} />
      </span>
    </div>
  )
}
