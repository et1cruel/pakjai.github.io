import { useEffect, useState } from "react"
import { Leaf, Pause, Play, RotateCcw } from "lucide-react"
import { Button } from "./ui"

type Saved = { status: "idle" | "running" | "paused" | "done"; endAt: number; left: number; total: number }
const KEY = "pakjai-focus-session"
const DEFAULT = 10 * 60 * 1000
const idle: Saved = { status: "idle", endAt: 0, left: DEFAULT, total: DEFAULT }

function load(): Saved {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || "null") as Saved | null
    if (!s) return idle
    if (s.status === "running" && s.endAt <= Date.now()) return { ...s, status: "done", left: 0 }
    return s
  } catch {
    return idle
  }
}

export default function FocusTimer({ onBack }: { onBack?: () => void }) {
  const [s, setS] = useState<Saved>(load)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    sessionStorage.setItem(KEY, JSON.stringify(s))
  }, [s])
  useEffect(() => {
    if (s.status !== "running") return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= s.endAt) setS((v) => ({ ...v, status: "done", left: 0 }))
    }, 250)
    return () => clearInterval(id)
  }, [s.status, s.endAt])

  const left = s.status === "running" ? Math.max(0, s.endAt - now) : s.left
  const secs = Math.ceil(left / 1000)
  const progress = s.status === "idle" ? 0 : 1 - left / s.total
  const R = 54
  const C = 2 * Math.PI * R
  const start = (ms: number) => {
    const t = Date.now()
    setNow(t)
    setS({ status: "running", endAt: t + ms, left: ms, total: ms })
  }

  return (
    <div className="flex flex-col items-center text-center" aria-live="polite">
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="64" cy="64" r={R} fill="none" stroke="#d8f3dc" strokeWidth="6" />
          <circle
            cx="64"
            cy="64"
            r={R}
            fill="none"
            stroke="#2d6a4f"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{ transition: "stroke-dashoffset .4s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-forest">
          {s.status === "done" ? (
            <Leaf size={44} strokeWidth={1.3} />
          ) : (
            <>
              <span className="text-4xl font-medium tabular-nums">
                {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
              </span>
              <span className="text-xs text-muted">
                {s.status === "paused" ? "หยุดไว้ชั่วคราว" : s.status === "running" ? "หายใจเข้า ออก ช้า ๆ" : "นาที"}
              </span>
            </>
          )}
        </div>
      </div>
      {s.status === "done" ? (
        <>
          <p className="mt-5 text-lg font-semibold text-earth">ขอบคุณที่ให้เวลาตัวเอง</p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            ครบเวลาแล้ว ไม่ต้องรีบทำอะไรต่อ เมื่อพร้อมค่อยกลับไปก็ได้
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="soft" onClick={() => start(5 * 60 * 1000)}>
              พักต่ออีก 5 นาที
            </Button>
            <Button
              onClick={() => {
                setS(idle)
                onBack?.()
              }}
            >
              กลับอย่างสบายใจ
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {s.status === "idle" && <Button onClick={() => start(DEFAULT)}>เริ่มพัก</Button>}
          {s.status === "running" && (
            <Button
              variant="soft"
              onClick={() => setS({ ...s, status: "paused", left: Math.max(0, s.endAt - Date.now()) })}
            >
              <Pause size={16} /> หยุดชั่วคราว
            </Button>
          )}
          {s.status === "paused" && (
            <Button onClick={() => start(s.left)}>
              <Play size={16} /> พักต่อ
            </Button>
          )}
          {s.status !== "idle" && (
            <Button variant="ghost" onClick={() => setS(idle)}>
              <RotateCcw size={16} /> ยกเลิก
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
