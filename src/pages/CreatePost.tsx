import { useRef, useState } from "react"
import {
  ArrowLeft,
  Globe,
  ImagePlus,
  Lock,
  Send,
  Users,
  X,
} from "lucide-react"
import type { Navigate } from "./Social"
import { interests, useStore, type Post } from "../store"
import { isCloud, services } from "../services"
import { supabase, uploadPostImage } from "../lib/supabase"
import { moderateText } from "../services/moderation"
import { ModVerdict } from "../components/AIGuard"
import { Avatar, Button, Card, Chip, Title, Toggle } from "../components/ui"
import { CategoryIcon } from "../components/icons"

const VIS = [
  { v: "สาธารณะ", Icon: Globe, hint: "ทุกคนเห็นได้" },
  { v: "ผู้ติดตาม", Icon: Users, hint: "เฉพาะคนที่ติดตามคุณ" },
  { v: "เฉพาะฉัน", Icon: Lock, hint: "เห็นแค่คุณคนเดียว" },
] as const

export function Create({ navigate }: { navigate: Navigate }) {
  const { state, update, toast } = useStore()
  const [text, setText] = useState("")
  const [category, setCategory] = useState(state.interests[0] || "ธรรมชาติ")
  const [warning, setWarning] = useState(false)
  const [visibility, setVisibility] = useState<string>(
    state.privateAccount ? "ผู้ติดตาม" : "สาธารณะ",
  )
  const [image, setImage] = useState("")
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const verdict =
    state.aiFilter && text.trim()
      ? moderateText(text, state.aiSensitivity)
      : null
  const blocked = verdict?.action === "block"
  const needsWarning = verdict?.action === "review" && !warning
  const visHint = VIS.find((o) => o.v === visibility)?.hint

  const onFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast("เลือกรูปภาพขนาดไม่เกิน 2 MB นะ")
      return
    }
    setLoading(true)
    const reader = new FileReader()
    reader.onload = () => {
      setImage(String(reader.result))
      setLoading(false)
    }
    reader.onerror = () => {
      toast("อ่านรูปภาพไม่สำเร็จ")
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  const publish = async () => {
    if (blocked) {
      toast("พักเรื่องนี้ไว้ก่อนนะ ลองเล่าในมุมที่เยียวยากว่าเดิม")
      return
    }
    let imageUrl = image
    if (isCloud && image.startsWith("data:")) {
      setLoading(true)
      try {
        const { data } = await supabase().auth.getUser()
        imageUrl = await uploadPostImage(image, data.user?.id ?? "anon")
      } catch {
        toast("อัปโหลดรูปไม่สำเร็จ ลองใหม่หรือโพสต์แบบไม่มีรูป")
        setLoading(false)
        return
      }
      setLoading(false)
    }
    const post: Post = {
      id: crypto.randomUUID(),
      author: state.name,
      handle: state.handle,
      text: text.trim(),
      category,
      image: imageUrl,
      warning: warning || verdict?.action === "review",
      visibility,
      liked: false,
      saved: false,
      reposted: false,
      likes: 0,
      comments: [],
    }
    update((s) => ({
      ...s,
      posts: [post, ...s.posts],
      mood: "ทั้งหมด",
    }))
    toast("แบ่งปันเรื่องของคุณแล้ว")
    navigate("community")
  }

  return (
    <div className="pj-stack">
      <Button variant="ghost" onClick={() => navigate("community")}>
        <ArrowLeft size={17} />
        กลับไปฟีด
      </Button>
      <Title sub="ไม่ต้องสมบูรณ์แบบ เรื่องเล็ก ๆ ก็มีความหมาย">
        แบ่งปันเรื่องของคุณ
      </Title>
      <Card className="pj-create">
        <div className="pj-create-head">
          <Avatar name={state.name} />
          <span className="pj-create-who">
            <strong>{state.name}</strong>
            <p>@{state.handle}</p>
          </span>
          <div className="pj-create-vis" role="group" aria-label="ใครเห็นโพสต์นี้ได้">
            {VIS.map(({ v, Icon, hint }) => (
              <button
                key={v}
                type="button"
                title={`${v} · ${hint}`}
                aria-label={`${v} · ${hint}`}
                aria-pressed={visibility === v}
                onClick={() => setVisibility(v)}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="pj-create-text"
          aria-label="เรื่องที่อยากแบ่งปัน"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="วันนี้ฉันพบความสุขเล็ก ๆ จาก..."
          rows={5}
          autoFocus
        />
        <div className="pj-create-meta">
          <span>{visHint}</span>
          <span>{text.length} ตัวอักษร</span>
        </div>

        {state.aiFilter && (
          <ModVerdict text={text} sensitivity={state.aiSensitivity} />
        )}

        {image ? (
          <div className="pj-create-preview">
            <img src={image} alt="ภาพก่อนเผยแพร่" className="pj-upload" />
            <button
              type="button"
              className="pj-create-remove"
              aria-label="นำรูปออก"
              onClick={() => setImage("")}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="pj-create-drop"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus size={22} />
            <span>
              <strong>เพิ่มรูปภาพ</strong>
              <small>ไม่เกิน 2 MB · เล่าเรื่องด้วยภาพก็ได้</small>
            </span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            onFile(e.target.files?.[0])
            e.target.value = ""
          }}
        />

        <p className="pj-overline">หมวดหมู่</p>
        <div className="pj-create-cats" role="group" aria-label="เลือกหมวดหมู่">
          {interests.map((m) => (
            <Chip
              key={m}
              selected={category === m}
              icon={<CategoryIcon name={m} size={15} />}
              onClick={() => setCategory(m)}
            >
              {m}
            </Chip>
          ))}
        </div>

        <Toggle
          label="คำเตือนเนื้อหาที่อาจกระทบความรู้สึก"
          checked={warning}
          onChange={setWarning}
        />
        <p className="pj-caption">
          {needsWarning
            ? "AI เห็นว่าเรื่องนี้อาจอ่อนไหว เราเปิดคำเตือนให้อัตโนมัติเมื่อเผยแพร่"
            : "AI จะตรวจเนื้อหาก่อนเผยแพร่ เรื่องที่เสี่ยงจะถูกพับไว้ ไม่แสดงในฟีดของคนอื่น"}
        </p>

        <div className="pj-create-foot">
          <Button variant="soft" onClick={() => navigate("community")}>
            ยกเลิก
          </Button>
          <Button
            className="pj-create-publish"
            disabled={(!text.trim() && !image) || loading || blocked}
            onClick={publish}
          >
            <Send size={16} />
            {loading ? "กำลังเผยแพร่..." : "เผยแพร่เรื่องราว"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
