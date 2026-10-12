import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react"
import type { Navigate } from "./Social"
import { interests, useStore } from "../store"
import { isCloud, services } from "../services"
import { CategoryIcon } from "../components/icons"
import { PakjaiMark } from "../components/Logo"
import { Button } from "../components/ui"

const STEPS = ["บัญชี", "ความสนใจ", "อารมณ์วันนี้"]
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export function Onboarding({ navigate }: { navigate: Navigate }) {
  const { state, update, toast } = useStore()
  const [step, setStep] = useState(0)
  const [login, setLogin] = useState(false)
  const [name, setName] = useState(state.joined ? state.name : "")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [selected, setSelected] = useState(state.interests)
  const [mood, setMood] = useState("ธรรมชาติ")
  const [busy, setBusy] = useState(false)
  const [authError, setAuthError] = useState("")

  const submitAuth = async () => {
    if (
      (!login && !name.trim()) ||
      !emailOk(email) ||
      password.length < 6
    )
      return
    if (!isCloud) {
      setPassword("")
      if (login) {
        update((s) => ({ ...s, joined: true }))
        toast("เข้าสู่บัญชีสาธิตบนอุปกรณ์นี้แล้ว")
        navigate("community")
      } else setStep(1)
      return
    }
    setBusy(true)
    setAuthError("")
    try {
      if (login) {
        await services.auth.signIn?.(email, password)
        update((s) => ({ ...s, joined: true }))
        toast("ยินดีต้อนรับกลับ")
        navigate("community")
      } else {
        await services.auth.signUp?.(email, password, name.trim())
        setStep(1)
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง")
    } finally {
      setBusy(false)
      setPassword("")
    }
  }

  const canSubmit =
    !busy &&
    (login || name.trim().length > 0) &&
    emailOk(email) &&
    password.length >= 6

  return (
    <div className="pj-auth">
      <div className="pj-auth-card">
        {/* ── Brand panel ── */}
        <aside className="pj-auth-brand">
          <img
            className="pj-auth-bg"
            src="https://images.unsplash.com/photo-1642846442523-d852165d44a0?w=900&h=1200&fit=crop&auto=format"
            alt=""
            aria-hidden
          />
          <div className="pj-auth-shade" aria-hidden />
          <div className="pj-auth-brand-top">
            <PakjaiMark size={46} />
            <span className="pj-auth-brand-name">
              <strong>Pakjai</strong>
              <small>พักใจ</small>
            </span>
          </div>
          <h2>พื้นที่ออนไลน์ที่ไม่มีข่าวร้ายมารบกวนใจ</h2>
          <p className="pj-auth-tag">
            ธรรมชาติ ความรู้ อาหาร และเรื่องดี ๆ
            สำหรับวันที่อยากพักจากโลก
          </p>
          <ul className="pj-auth-points">
            <li>
              <ShieldCheck size={17} />
              AI ช่วยคัดกรองเนื้อหาที่รบกวนใจ
            </li>
            <li>
              <Leaf size={17} />
              เลือกเห็นเฉพาะหมวดที่ใจต้องการ
            </li>
            <li>
              <Sparkles size={17} />
              ชุมชนอ่อนโยน ไม่ต้องรีบ ไม่ต้องเปรียบเทียบ
            </li>
          </ul>
          <blockquote className="pj-auth-quote">
            “ไม่ต้องตามให้ทันทุกเรื่อง
            <br />
            แค่มีพื้นที่ให้ใจได้พัก”
          </blockquote>
        </aside>

        {/* ── Form panel ── */}
        <div className="pj-auth-form">
          <ol className="pj-auth-steps" aria-label="ขั้นตอนการสมัคร">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={i < step ? "done" : i === step ? "active" : ""}
                aria-current={i === step ? "step" : undefined}
              >
                <span className="pj-auth-dot">
                  {i < step ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>

          <div key={`${step}-${login}`} className="animate-fade-in-up">
            {step === 0 && (
              <>
                <h1 className="pj-auth-title">
                  {login ? "กลับมาพักใจ" : "เริ่มต้นในจังหวะของคุณ"}
                </h1>
                <p className="pj-caption">
                  {isCloud
                    ? "บัญชีจริงของชุมชนพักใจ เก็บอย่างปลอดภัยบน Supabase"
                    : "บัญชีสาธิตในเบราว์เซอร์ ไม่ใช่การสมัครจริง กรุณาอย่าใช้รหัสผ่านจริง"}
                </p>

                <div
                  className="pj-auth-segment"
                  role="group"
                  aria-label="เลือกระหว่างสมัครใหม่หรือเข้าสู่ระบบ"
                >
                  <button
                    type="button"
                    aria-pressed={!login}
                    onClick={() => {
                      setLogin(false)
                      setAuthError("")
                    }}
                  >
                    {isCloud ? "สมัครสมาชิก" : "สร้างบัญชีสาธิต"}
                  </button>
                  <button
                    type="button"
                    aria-pressed={login}
                    onClick={() => {
                      setLogin(true)
                      setAuthError("")
                    }}
                  >
                    มีบัญชีอยู่แล้ว
                  </button>
                </div>

                {!login && (
                  <label className="pj-auth-field">
                    <span>ชื่อที่อยากให้เรียก</span>
                    <span className="pj-auth-control">
                      <User size={17} className="lead" aria-hidden />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="เช่น ปาลิน"
                        autoComplete="nickname"
                      />
                    </span>
                  </label>
                )}
                <label className="pj-auth-field">
                  <span>อีเมล</span>
                  <span className="pj-auth-control">
                    <Mail size={17} className="lead" aria-hidden />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="palin@example.com"
                      autoComplete="email"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && canSubmit) submitAuth()
                      }}
                    />
                  </span>
                  {!!email && !emailOk(email) && (
                    <small className="pj-auth-hint">รูปแบบอีเมลยังไม่ถูกต้อง</small>
                  )}
                </label>
                <label className="pj-auth-field">
                  <span>รหัสผ่าน</span>
                  <span className="pj-auth-control">
                    <Lock size={17} className="lead" aria-hidden />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      autoComplete={login ? "current-password" : "new-password"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && canSubmit) submitAuth()
                      }}
                    />
                    <button
                      type="button"
                      className="pj-auth-eye"
                      aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      onClick={() => setShowPw(!showPw)}
                    >
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>

                {authError && (
                  <p className="pj-auth-error" role="alert">
                    {authError}
                  </p>
                )}

                <Button
                  className="pj-auth-submit"
                  disabled={!canSubmit}
                  onClick={submitAuth}
                >
                  {busy
                    ? "รอสักครู่..."
                    : login
                      ? isCloud
                        ? "เข้าสู่ระบบ"
                        : "เข้าสู่บัญชีสาธิต"
                      : "ไปต่อ"}
                  {!busy && <ArrowRight size={17} />}
                </Button>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="pj-auth-title">อะไรทำให้คุณรู้สึกดี?</h1>
                <p className="pj-caption">
                  เลือกได้หลายอย่าง และเปลี่ยนได้เสมอ
                  {selected.length > 0 && ` · เลือกแล้ว ${selected.length} อย่าง`}
                </p>
                <div className="pj-auth-grid">
                  {interests.map((i) => {
                    const on = selected.includes(i)
                    return (
                      <button
                        key={i}
                        type="button"
                        className="pj-auth-pick"
                        aria-pressed={on}
                        onClick={() =>
                          setSelected((s) =>
                            s.includes(i)
                              ? s.filter((v) => v !== i)
                              : [...s, i],
                          )
                        }
                      >
                        <span className="pj-auth-ic">
                          <CategoryIcon name={i} size={19} />
                        </span>
                        {i}
                        {on && (
                          <span className="pj-auth-tick" aria-hidden>
                            <Check size={15} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="pj-auth-actions">
                  <Button variant="soft" onClick={() => setStep(0)}>
                    <ArrowLeft size={16} />
                    ย้อนกลับ
                  </Button>
                  <Button disabled={!selected.length} onClick={() => setStep(2)}>
                    เลือกอารมณ์วันนี้
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="pj-auth-title">วันนี้อยากพักใจแบบไหน?</h1>
                <p className="pj-caption">เนื้อหาในฟีดจะปรับตามอารมณ์นี้</p>
                <div className="pj-auth-grid">
                  {interests.map((i) => {
                    const on = mood === i
                    return (
                      <button
                        key={i}
                        type="button"
                        className="pj-auth-pick"
                        aria-pressed={on}
                        onClick={() => setMood(i)}
                      >
                        <span className="pj-auth-ic">
                          <CategoryIcon name={i} size={19} />
                        </span>
                        {i}
                        {on && (
                          <span className="pj-auth-tick" aria-hidden>
                            <Check size={15} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="pj-auth-actions">
                  <Button variant="soft" onClick={() => setStep(1)}>
                    <ArrowLeft size={16} />
                    ย้อนกลับ
                  </Button>
                  <Button
                    onClick={() => {
                      update((s) => ({
                        ...s,
                        joined: true,
                        name: name.trim() || s.name,
                        interests: selected,
                        mood,
                      }))
                      navigate("community")
                      toast("ยินดีต้อนรับ พักในจังหวะของคุณได้เลย")
                    }}
                  >
                    <Sparkles size={16} />
                    เริ่มพักใจ
                  </Button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="pj-auth-skip"
            onClick={() => navigate("home")}
          >
            สำรวจก่อน ยังไม่ต้องสมัคร
          </button>
        </div>
      </div>
    </div>
  )
}
