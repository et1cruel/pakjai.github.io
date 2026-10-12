import { useRef, useState } from "react"
import { Drumstick, Salad, Shuffle, Soup, Wheat, RotateCcw } from "lucide-react"

const segments = [
  { id: "veggie", label: "มีผัก", Icon: Salad, angle: 315, color: "#d8f3dc", text: "#1b4332", menus: ["ผัดผักรวมใส่เต้าหู้", "ต้มจืดตำลึงหมูสับ", "ยำวุ้นเส้นผักสด", "แกงเลียงผักรวม", "ผัดบวบใส่ไข่"] },
  { id: "meat", label: "ไม่มีผัก", Icon: Drumstick, angle: 45, color: "#f5e6de", text: "#6b3d22", menus: ["ข้าวมันไก่", "หมูทอดกระเทียม", "ไก่ย่างส้มตำ", "ข้าวหน้าเป็ดย่าง", "ปลาทอดน้ำปลา"] },
  { id: "soup", label: "เน้นน้ำ", Icon: Soup, angle: 135, color: "#e6f1f7", text: "#17435c", menus: ["ก๋วยเตี๋ยวเรือ", "ต้มยำน้ำใส", "ข้าวต้มปลา", "บะหมี่เกี๊ยวน้ำ", "แกงจืดเต้าหู้หมูสับ"] },
  { id: "rice", label: "เน้นข้าว", Icon: Wheat, angle: 225, color: "#fef9e7", text: "#5c4300", menus: ["ข้าวผัดกะเพราไข่ดาว", "ข้าวไข่เจียวหมูสับ", "ข้าวคลุกกะปิ", "ข้าวหน้าปลาแซลมอน", "ข้าวผัดต้มยำ"] },
]
type Seg = (typeof segments)[number]
const pos = { veggie: "left-[26%] top-[26%]", meat: "left-[74%] top-[26%]", soup: "left-[74%] top-[74%]", rice: "left-[26%] top-[74%]" }
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

export default function FoodWheel({ size = 280, onDark = false }: { size?: number; onDark?: boolean }) {
  const [filter, setFilter] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ menu: string; seg: Seg } | null>(null)
  const timer = useRef<number>(0)

  const spin = (only: string | null = filter) => {
    if (spinning) return
    const seg = only ? segments.find((s) => s.id === only)! : pick(segments)
    const menu = pick(seg.menus)
    const jitter = Math.random() * 50 - 25
    const turn = Math.ceil(rotation / 360) * 360 + 360 * 3 + ((360 - seg.angle + jitter) % 360)
    setResult(null)
    setSpinning(true)
    setRotation(turn)
    timer.current = window.setTimeout(() => {
      setResult({ menu, seg })
      setSpinning(false)
    }, 1700)
  }
  const choose = (id: string) => {
    if (spinning) return
    setResult(null)
    setFilter(filter === id ? null : id)
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <div
          aria-hidden
          className="absolute -top-2 left-1/2 z-10 h-4 w-4 -translate-x-1/2 rotate-45 rounded-sm bg-forest shadow-organic"
        />
        <div
          className="relative h-full w-full"
          style={{ transform: `rotate(${rotation}deg)`, transition: "transform 1.6s cubic-bezier(.15,.7,.15,1)" }}
        >
          <svg viewBox="0 0 280 280" className="h-full w-full drop-shadow-sm">
            {[
              ["M140,140 L140,12 A128,128 0 0,0 12,140 Z", 0],
              ["M140,140 L268,140 A128,128 0 0,0 140,12 Z", 1],
              ["M140,140 L140,268 A128,128 0 0,0 268,140 Z", 2],
              ["M140,140 L12,140 A128,128 0 0,0 140,268 Z", 3],
            ].map(([d, i]) => {
              const seg = segments[i as number]
              const dim = filter && filter !== seg.id
              return (
                <path
                  key={seg.id}
                  d={d as string}
                  fill={dim ? "#eeece6" : seg.color}
                  stroke="#faf9f5"
                  strokeWidth="4"
                  className="cursor-pointer transition-colors duration-300"
                  onClick={() => choose(seg.id)}
                />
              )
            })}
            <circle cx="140" cy="140" r="30" fill="#faf9f5" stroke="rgba(45,106,79,.15)" strokeWidth="2" />
          </svg>
          {segments.map(({ id, Icon, text, label }) => (
            <span
              key={id}
              className={`pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 ${pos[id as keyof typeof pos]}`}
              style={{ color: text }}
            >
              <Icon size={size * 0.12} strokeWidth={1.4} />
              <span className="text-[11px] font-medium">{label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid w-full max-w-xs grid-cols-2 gap-2">
        {segments.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => choose(id)}
            className={`pj-filter justify-center ${filter === id ? "is-selected" : ""} ${onDark && filter !== id ? "on-dark" : ""}`}
          >
            <Icon size={15} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={spinning}
        onClick={() => spin()}
        className="pj-button pj-button-primary w-full max-w-xs"
        style={onDark ? { background: "#faf9f5", color: "#1b4332" } : undefined}
      >
        <Shuffle size={16} />
        {spinning ? "กำลังหมุน..." : filter ? "สุ่มจากหมวดที่เลือก" : "สุ่มทั้งหมด"}
      </button>

      <div className="min-h-[7rem] w-full max-w-xs" aria-live="polite">
        {result && (
          <div
            className="animate-fade-in-up rounded-3xl bg-cream-card p-5 text-center shadow-organic"
            style={{ borderTop: `4px solid ${result.seg.color}` }}
          >
            <p className="text-xs text-muted">วันนี้ลองกิน</p>
            <p className="my-1 text-xl font-semibold text-earth">{result.menu}</p>
            <p className="text-xs text-muted">หมวด{result.seg.label}</p>
            <button
              type="button"
              onClick={() => spin()}
              className="pj-button pj-button-soft mt-3"
            >
              <RotateCcw size={15} />
              อีกครั้ง
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
