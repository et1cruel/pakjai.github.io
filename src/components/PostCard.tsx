import { useState } from "react"
import {
  Heart,
  Bookmark,
  MessageCircle,
  Repeat2,
  Share2,
  Flag,
  Trash2,
  Leaf,
} from "lucide-react"
import { useStore, type Post } from "../store"
import { services } from "../services"
import { moderateText } from "../services/moderation"
import { Avatar, Button, Card, Modal, Select } from "./ui"
import Cover from "./Cover"
import type { Page } from "../App"

export async function share(text: string, toast: (s: string) => void) {
  try {
    if (navigator.share)
      await navigator.share({ title: "พักใจ", text, url: location.href })
    else {
      await navigator.clipboard.writeText(`${text}\n${location.href}`)
      toast("คัดลอกข้อความและลิงก์แล้ว")
    }
  } catch {
    toast("ยังไม่ได้แชร์ ลองใหม่ได้เมื่อพร้อม")
  }
}
export default function PostCard({
  post,
  navigate,
}: {
  post: Post
  navigate: (p: Page, id?: string) => void
}) {
  const { state, update, toast } = useStore()
  const [revealed, setRevealed] = useState(false)
  const [modal, setModal] = useState<"delete" | "report" | null>(null)
  const [reason, setReason] = useState("การคุกคามหรือกลั่นแกล้ง")
  const [reported, setReported] = useState(false)
  const toggle = (key: "liked" | "saved" | "reposted") =>
    update((s) => ({
      ...s,
      posts: s.posts.map((p) =>
        p.id === post.id ? { ...p, [key]: !p[key] } : p,
      ),
    }))
  const ai = state.aiFilter ? moderateText(post.text, state.aiSensitivity) : null
  const sensitive = post.warning || (ai && ai.action !== "allow")
  return (
    <Card className="pj-post">
      <div className="pj-row">
        <div className="pj-person">
          <Avatar name={post.author} />
          <div>
            <strong>
              {post.handle === state.handle ? state.name : post.author}
            </strong>
            <p>@{post.handle} · วันนี้</p>
          </div>
        </div>
        <span className="pj-chip">{post.category}</span>
      </div>
      <p className="pj-caption">
        {post.visibility} ·{" "}
        {post.reposted ? "คุณแบ่งปันเรื่องนี้แล้ว" : "เรื่องเล็ก ๆ จากคนที่คุณติดตาม"}
      </p>
      {sensitive && !revealed ? (
        <div className="pj-warning">
          <p>เนื้อหานี้อาจกระทบความรู้สึก อ่านเมื่อคุณพร้อม</p>
          {ai && ai.action !== "allow" && !post.warning && (
            <p className="pj-caption">AI ตรวจพบ: {ai.reasons[0]}</p>
          )}
          <Button variant="soft" onClick={() => setRevealed(true)}>
            แสดงเนื้อหา
          </Button>
        </div>
      ) : (
        <>
          <Button
            variant="ghost"
            className="pj-post-text"
            onClick={() => navigate("article", post.id)}
          >
            {post.text}
          </Button>
          <Cover
            src={post.image}
            alt="ภาพที่สมาชิกแบ่งปัน"
            category={post.category}
            seed={post.id}
            className={`pj-cover ${post.image ? "" : "is-fallback"}`}
            imgClassName="max-h-[450px]"
          />
        </>
      )}
      <div className="pj-actions">
        <Button
          variant="ghost"
          aria-label="ส่งกำลังใจ"
          aria-pressed={post.liked}
          onClick={() => toggle("liked")}
        >
          <Heart size={18} fill={post.liked ? "currentColor" : "none"} />
          {!state.hideCounts && post.likes + Number(post.liked)}
        </Button>
        <Button
          variant="ghost"
          aria-label="ความคิดเห็น"
          onClick={() => navigate("article", post.id)}
        >
          <MessageCircle size={18} />
          {state.hideCounts
            ? null
            : post.comments.length
              ? `${post.comments.length} ความคิดเห็น`
              : "ความคิดเห็น"}
        </Button>
        <Button
          variant="ghost"
          aria-label="รีโพสต์"
          aria-pressed={post.reposted}
          onClick={() => toggle("reposted")}
        >
          <Repeat2 size={18} />
        </Button>
        <Button
          variant="ghost"
          aria-label="แชร์โพสต์"
          onClick={() => share(post.text, toast)}
        >
          <Share2 size={18} />
        </Button>
        <Button
          variant="ghost"
          aria-label="บันทึกโพสต์"
          aria-pressed={post.saved}
          onClick={() => toggle("saved")}
        >
          <Bookmark size={18} fill={post.saved ? "currentColor" : "none"} />
        </Button>
        <Button
          variant="ghost"
          aria-label="รายงานโพสต์"
          onClick={() => {
            setReported(false)
            setModal("report")
          }}
        >
          <Flag size={16} />
        </Button>
        {post.handle === state.handle && (
          <Button
            variant="ghost"
            aria-label="ลบโพสต์"
            onClick={() => setModal("delete")}
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
      {modal === "delete" && (
        <Modal title="ลบเรื่องที่แบ่งปัน?" onClose={() => setModal(null)}>
          <p>โพสต์และความคิดเห็นจะถูกลบ การกระทำนี้ย้อนกลับไม่ได้</p>
          <div className="pj-actions">
            <Button variant="soft" onClick={() => setModal(null)}>
              เก็บไว้ก่อน
            </Button>
            <Button
              onClick={() => {
                update((s) => ({
                  ...s,
                  posts: s.posts.filter((p) => p.id !== post.id),
                }))
                setModal(null)
                toast("ลบโพสต์แล้ว")
                navigate("community")
              }}
            >
              ยืนยันลบโพสต์
            </Button>
          </div>
        </Modal>
      )}
      {modal === "report" && (
        <Modal
          title={reported ? "ขอบคุณที่ช่วยดูแลพื้นที่นี้" : "รายงานเนื้อหา"}
          onClose={() => setModal(null)}
        >
          {reported ? (
            <>
              <p>รับรายงานแล้ว และซ่อนโพสต์นี้จากฟีดของคุณแล้ว ดูหรือยกเลิกรายงานได้ในการตั้งค่า</p>
              {reason === "การทำร้ายตัวเอง" && (
                <Card>
                  <Leaf />
                  <strong>คุณไม่จำเป็นต้องผ่านเรื่องนี้คนเดียว</strong>
                  <p>
                    หากคุณหรือคนใกล้ตัวไม่ปลอดภัย โทร 1669 ในกรณีฉุกเฉิน หรือสายด่วนสุขภาพจิต
                    1323 และติดต่อคนที่ไว้ใจให้อยู่เป็นเพื่อน
                  </p>
                </Card>
              )}
              <Button onClick={() => setModal(null)}>กลับไปพักใจ</Button>
            </>
          ) : (
            <>
              <Select
                label="เหตุผลในการรายงาน"
                value={reason}
                onChange={setReason}
                options={[
                  "การคุกคามหรือกลั่นแกล้ง",
                  "ข้อมูลที่ทำให้เข้าใจผิด",
                  "สแปมหรือโฆษณา",
                  "การทำร้ายตัวเอง",
                  "เนื้อหาไม่เหมาะสม",
                ]}
              />
              <p>ตรวจสอบเหตุผลก่อนยืนยัน เราจะไม่แจ้งชื่อของคุณให้เจ้าของโพสต์ทราบ</p>
              <Button
                onClick={async () => {
                  localStorage.setItem(`pakjai-report-${post.id}`, reason)
                  try {
                    await services.reportPost?.(post.id, reason)
                  } catch {
                    /* local fallback below still hides it for the reporter */
                  }
                  update((s) => ({
                    ...s,
                    hiddenPosts: [...new Set([...s.hiddenPosts, post.id])],
                  }))
                  setReported(true)
                  toast("ซ่อนโพสต์นี้จากฟีดของคุณแล้ว ขอบคุณที่ช่วยดูแล")
                }}
              >
                ยืนยันรายงาน
              </Button>
            </>
          )}
        </Modal>
      )}
    </Card>
  )
}
