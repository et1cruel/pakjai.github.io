import { useEffect, useRef, useState } from "react"
import {
  Leaf,
  Plus,
  Check,
  ArrowLeft,
  Send,
  Moon,
  Clock,
  Settings,
  MessageCircle,
  Bell,
  Home,
  Compass,
  Utensils,
  User,
  LogIn,
} from "lucide-react"
import type { Page } from "../App"
import { interests, useStore, type Post } from "../store"
import { services, isCloud } from "../services"
import { supabase, uploadPostImage } from "../lib/supabase"
import { moderateText } from "../services/moderation"
import { AIFilterIndicator, ModVerdict } from "../components/AIGuard"
import PostCard, { share } from "../components/PostCard"
import { CategoryIcon } from "../components/icons"
import FocusTimer from "../components/FocusTimer"
import {
  Avatar,
  Button,
  Card,
  Chip,
  Input,
  Modal,
  Select,
  TextArea,
  Title,
  Toggle,
} from "../components/ui"

export type Navigate = (page: Page, id?: string) => void
interface SidebarProps {
  page: Page
  navigate: Navigate
}
export function Sidebar({ page, navigate }: SidebarProps) {
  const { state } = useStore()
  const items = [
    { page: "home", label: "หน้าแรก", icon: Home },
    { page: "community", label: "พื้นที่ของเรา", icon: Leaf },
    { page: "discover", label: "ค้นพบ", icon: Compass },
    { page: "food", label: "อาหาร", icon: Utensils },
    { page: "notifications", label: "การแจ้งเตือน", icon: Bell },
    { page: "messages", label: "ข้อความ", icon: MessageCircle },
    { page: "wellbeing", label: "ดูแลใจ", icon: Moon },
    { page: "profile", label: "โปรไฟล์", icon: User },
    { page: "settings", label: "ตั้งค่า", icon: Settings },
  ] as const
  return (
    <aside className="pj-sidebar">
      <p className="pj-overline">A LITTLE SPACE TO BREATHE</p>
      <nav aria-label="เมนูหลัก">
        {items.map((item) => (
          <Button
            key={item.page}
            variant={page === item.page ? "soft" : "ghost"}
            onClick={() => navigate(item.page)}
            aria-current={page === item.page ? "page" : undefined}
          >
            <item.icon size={19} />
            {item.label}
          </Button>
        ))}
      </nav>
      <Button onClick={() => navigate("create")}>
        <Plus size={18} />
        แบ่งปันเรื่องดี ๆ
      </Button>
      <div className="pj-sidebar-note">
        <Leaf size={22} />
        <p>
          ไม่ต้องตามให้ทันทุกเรื่อง
          <br />
          แค่มีพื้นที่ให้ใจได้พัก
        </p>
      </div>
      <Button variant="ghost" onClick={() => navigate("onboarding")}>
        <LogIn size={17} />
        {state.joined ? "บัญชีของฉัน" : "เริ่มเป็นส่วนหนึ่ง"}
      </Button>
    </aside>
  )
}
export function SocialFeed({
  navigate,
  compact = false,
}: {
  navigate: Navigate
  compact?: boolean
}) {
  const { state, update } = useStore()
  const [showHidden, setShowHidden] = useState(false)
  const isMine = (p: Post) => p.handle === state.handle
  const aiVerdict = (p: Post) =>
    state.aiFilter ? moderateText(p.text, state.aiSensitivity) : null
  const visible = state.posts.filter((p) => {
    if (state.hiddenPosts.includes(p.id)) return false
    if (p.visibility === "เฉพาะฉัน" && !isMine(p)) return false
    if (p.visibility === "ผู้ติดตาม" && !isMine(p) && !state.following.includes(p.handle))
      return false
    if (state.mood !== "ทั้งหมด" && p.category !== state.mood) return false
    if (state.mutedWords.some((w) => w && p.text.includes(w))) return false
    if (state.mutedAccounts.includes(p.handle)) return false
    if (state.blocked.includes(p.handle)) return false
    return true
  })
  const aiHidden = visible.filter((p) => aiVerdict(p)?.action === "block")
  const softWarned = visible.filter((p) => aiVerdict(p)?.action === "review" && !p.warning)
  const shown = showHidden
    ? visible
    : visible.filter((p) => !aiHidden.includes(p))
  return (
    <div className={compact ? "pj-home-feed" : "pj-stack"}>
      <Title sub="จากคนที่คุณติดตาม • ไม่ต้องรีบ ไม่ต้องเปรียบเทียบ">พื้นที่ของเรา</Title>
      {!compact && <AIFilterIndicator />}
      {state.aiFilter && aiHidden.length > 0 && (
        <Card className="pj-end">
          <strong>AI พักเรื่องที่อาจรบกวนใจไว้ {aiHidden.length} เรื่อง</strong>
          <p>เราไม่ลบของใคร แค่พับไว้ก่อน คุณเลือกเปิดดูเองได้เมื่อพร้อม</p>
          <Button variant="soft" onClick={() => setShowHidden(!showHidden)}>
            {showHidden ? "ซ่อนไว้เหมือนเดิม" : "แสดงเรื่องที่พับไว้"}
          </Button>
        </Card>
      )}
      {state.aiFilter && softWarned.length > 0 && (
        <p className="pj-caption">
          เรื่องที่อาจอ่อนไหว {softWarned.length} เรื่องถูกเบลอไว้แล้ว เปิดอ่านได้เมื่อพร้อม
        </p>
      )}
      <Card className="pj-compose">
        <Avatar name={state.name} />
        <Button
          variant="ghost"
          aria-label="เขียนเรื่องดี ๆ"
          onClick={() => navigate("create")}
        >
          วันนี้มีเรื่องเล็ก ๆ อะไรอยากแบ่งปันไหม?
        </Button>
        <Plus size={20} aria-hidden className="text-forest" />
      </Card>
      <div className="pj-chips" role="group" aria-label="กรองตามหมวด">
        {["ทั้งหมด", ...interests].map((m) => (
          <Chip
            key={m}
            selected={state.mood === m}
            icon={m === "ทั้งหมด" ? undefined : <CategoryIcon name={m} size={15} />}
            onClick={() => update((s) => ({ ...s, mood: m }))}
          >
            {m}
          </Chip>
        ))}
      </div>
      {!shown.length && (
        <Card className="pj-end">
          <CategoryIcon name={state.mood} size={28} />
          <strong>ยังไม่มีเรื่องในหมวด{state.mood}</strong>
          <p>ลองเลือกหมวดอื่น หรือเป็นคนแรกที่แบ่งปันเรื่องเล็ก ๆ ในหมวดนี้</p>
          <div className="pj-actions">
            <Button
              variant="soft"
              onClick={() => update((s) => ({ ...s, mood: "ทั้งหมด" }))}
            >
              ดูทั้งหมด
            </Button>
            <Button onClick={() => navigate("create")}>เขียนเรื่องดี ๆ</Button>
          </div>
        </Card>
      )}
      {shown.map((p) => (
        <PostCard key={p.id} post={p} navigate={navigate} />
      ))}
      {shown.length > 0 && <Card className="pj-end">
        <Check size={26} />
        <strong>คุณอ่านครบแล้ว</strong>
        <p>เรื่องดี ๆ วันนี้อยู่ตรงนี้ครบแล้ว ลองพักสายตา มองออกไปนอกหน้าต่างสักนิดนะ</p>
        <Button variant="soft" onClick={() => navigate("wellbeing")}>
          พักใจสักครู่
        </Button>
      </Card>}
    </div>
  )
}
export function Reminder() {
  const { state } = useStore()
  const [dismissed, setDismissed] = useState("")
  const key = `${state.day}-${state.limit}`
  return state.minutes >= state.limit && dismissed !== key ? (
    <div className="pj-reminder" role="status">
      <Leaf size={20} />
      <span>
        วันนี้คุณใช้เวลาที่นี่ {state.minutes} นาทีแล้ว พักสายตาสักนิดไหม?
        คุณยังใช้งานต่อได้ตามสบาย
      </span>
      <Button variant="soft" onClick={() => setDismissed(key)}>
        ไว้ก่อน
      </Button>
    </div>
  ) : null
}
export default function Social({
  page,
  id,
  navigate,
}: {
  page: Page
  id?: string
  navigate: Navigate
}) {
  return (
    <div className="pj-page">
      {page === "community" && <SocialFeed navigate={navigate} />}
      {page === "create" && <Create navigate={navigate} />}
      {page === "article" && <Detail id={id} navigate={navigate} />}
      {page === "profile" && <Profile navigate={navigate} />}
      {page === "search" && <Search navigate={navigate} initial={id} />}
      {page === "notifications" && <Notifications navigate={navigate} />}
      {page === "messages" && <Messages />}
      {page === "wellbeing" && <Wellbeing />}
      {page === "settings" && <Preferences navigate={navigate} />}
      {page === "onboarding" && <Onboarding navigate={navigate} />}
    </div>
  )
}
function Create({ navigate }: { navigate: Navigate }) {
  const { state, update, toast } = useStore()
  const [text, setText] = useState("")
  const [category, setCategory] = useState(state.interests[0] || "ธรรมชาติ")
  const [warning, setWarning] = useState(false)
  const [visibility, setVisibility] = useState(
    state.privateAccount ? "ผู้ติดตาม" : "สาธารณะ",
  )
  const [image, setImage] = useState("")
  const [loading, setLoading] = useState(false)
  const verdict =
    state.aiFilter && text.trim()
      ? moderateText(text, state.aiSensitivity)
      : null
  const blocked = verdict?.action === "block"
  const needsWarning = verdict?.action === "review" && !warning
  return (
    <div className="pj-stack">
      <Title sub="ไม่ต้องสมบูรณ์แบบ เรื่องเล็ก ๆ ก็มีความหมาย">แบ่งปันเรื่องของคุณ</Title>
      <Card>
        <div className="pj-person">
          <Avatar name={state.name} />
          <strong>{state.name}</strong>
        </div>
        <TextArea
          label="เรื่องที่อยากแบ่งปัน"
          value={text}
          onChange={setText}
          placeholder="วันนี้ฉันพบความสุขเล็ก ๆ จาก..."
        />
        {state.aiFilter && (
          <ModVerdict text={text} sensitivity={state.aiSensitivity} />
        )}
        <Input
          label="เพิ่มรูปภาพ (ไม่เกิน 2 MB)"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
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
          }}
        />
        {image && (
          <>
            <img src={image} alt="ภาพก่อนเผยแพร่" className="pj-upload" />
            <Button variant="ghost" onClick={() => setImage("")}>
              นำรูปออก
            </Button>
          </>
        )}
        <Select
          label="หมวดหมู่"
          value={category}
          onChange={setCategory}
          options={interests}
        />
        <Toggle
          label="คำเตือนเนื้อหาที่อาจกระทบความรู้สึก"
          checked={warning}
          onChange={setWarning}
        />
        <Select
          label="ใครเห็นโพสต์นี้ได้"
          value={visibility}
          onChange={setVisibility}
          options={["สาธารณะ", "ผู้ติดตาม", "เฉพาะฉัน"]}
        />
        <p className="pj-caption">
          {needsWarning
            ? "AI เห็นว่าเรื่องนี้อาจอ่อนไหว เราเปิดคำเตือนให้อัตโนมัติเมื่อเผยแพร่"
            : "AI จะตรวจเนื้อหาก่อนเผยแพร่ เรื่องที่เสี่ยงจะถูกพับไว้ ไม่แสดงในฟีดของคนอื่น"}
        </p>
        <div className="pj-actions">
          <Button variant="soft" onClick={() => navigate("community")}>
            ยกเลิก
          </Button>
          <Button
            disabled={(!text.trim() && !image) || loading || blocked}
            onClick={async () => {
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
            }}
          >
            เผยแพร่เรื่องราว
          </Button>
        </div>
      </Card>
    </div>
  )
}
interface DetailProps {
  id?: string
  navigate: Navigate
}
function Detail({ id, navigate }: DetailProps) {
  const { state, update } = useStore()
  const post = state.posts.find((p) => p.id === id)
  const [text, setText] = useState("")
  const [parent, setParent] = useState<string>()
  if (!post)
    return (
      <Card>
        <Title>ไม่พบเรื่องราวนี้</Title>
        <Button onClick={() => navigate("community")}>กลับไปพื้นที่ของเรา</Button>
      </Card>
    )
  const allowed = state.comments !== "ไม่มีใคร" || post.handle === state.handle
  return (
    <div className="pj-stack">
      <Button variant="ghost" onClick={() => navigate("community")}>
        <ArrowLeft size={18} />
        กลับไปเรื่องราว
      </Button>
      <PostCard post={post} navigate={navigate} />
      <Card>
        <Title>บทสนทนาเล็ก ๆ</Title>
        {post.comments.length === 0 && (
          <p className="pj-caption">ยังไม่มีความคิดเห็น เป็นคนแรกที่ส่งความอบอุ่นได้เลย</p>
        )}
        {post.comments
          .filter((c) => !c.parent)
          .map((c) => (
            <div key={c.id} className="pj-comment">
              <div className="pj-person">
                <Avatar name={c.author} />
                <strong>{c.author}</strong>
              </div>
              <p>{c.text}</p>
              <Button variant="ghost" onClick={() => setParent(c.id)}>
                ตอบกลับ
              </Button>
              {post.comments
                .filter((r) => r.parent === c.id)
                .map((r) => (
                  <div key={r.id} className="pj-reply">
                    <strong>{r.author}</strong>
                    <p>{r.text}</p>
                  </div>
                ))}
            </div>
          ))}
        {allowed ? (
          <>
            {parent && (
              <div className="pj-row">
                <p>
                  กำลังตอบกลับ{" "}
                  {post.comments.find((c) => c.id === parent)?.author}
                </p>
                <Button variant="ghost" onClick={() => setParent(undefined)}>
                  ยกเลิก
                </Button>
              </div>
            )}
            <TextArea
              label="ความคิดเห็นด้วยความใส่ใจ"
              value={text}
              onChange={setText}
              placeholder="เขียนสิ่งที่อยากบอก..."
            />
            <Button
              disabled={!text.trim()}
              onClick={() => {
                update((s) => ({
                  ...s,
                  posts: s.posts.map((p) =>
                    p.id === id
                      ? {
                          ...p,
                          comments: [
                            ...p.comments,
                            {
                              id: crypto.randomUUID(),
                              text: text.trim(),
                              author: s.name,
                              parent,
                            },
                          ],
                        }
                      : p,
                  ),
                }))
                setText("")
                setParent(undefined)
              }}
            >
              <Send size={16} />
              ส่งความคิดเห็น
            </Button>
          </>
        ) : (
          <p>ปิดการแสดงความคิดเห็นตามการตั้งค่าความเป็นส่วนตัว</p>
        )}
      </Card>
    </div>
  )
}
function Profile({ navigate }: { navigate: Navigate }) {
  const { state, update, toast } = useStore()
  const [tab, setTab] = useState("โพสต์")
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(state.name)
  const [bio, setBio] = useState(state.bio)
  const posts = state.posts.filter((p) =>
    tab === "โพสต์"
      ? p.handle === state.handle || p.reposted
      : tab === "บันทึก"
        ? p.saved
        : p.liked,
  )
  return (
    <div className="pj-stack">
      <Card className="pj-profile">
        <div className="pj-profile-cover">
          <Leaf size={48} />
        </div>
        <div className="pj-row">
          <div className="pj-person">
            <Avatar name={state.name} />
            <Title sub={`@${state.handle}`}>{state.name}</Title>
          </div>
          <Button
            variant="ghost"
            aria-label="ตั้งค่า"
            onClick={() => navigate("settings")}
          >
            <Settings size={20} />
          </Button>
        </div>
        <p>{state.bio}</p>
        <div className="pj-profile-stats">
          <span>
            <strong>
              {state.posts.filter((p) => p.handle === state.handle).length}
            </strong>{" "}
            โพสต์
          </span>
          <span>
            {!state.hideCounts && <strong>{state.following.length} </strong>}ติดตาม
          </span>
          <span>{!state.hideCounts && <strong>12 </strong>}ผู้ติดตาม*</span>
        </div>
        <p className="pj-caption">*ตัวเลขผู้ติดตามเป็นตัวอย่าง ระบบติดตามจริงต้องมีเซิร์ฟเวอร์</p>
        <div className="pj-actions">
          <Button
            onClick={() => {
              setName(state.name)
              setBio(state.bio)
              setEdit(true)
            }}
          >
            แก้ไขโปรไฟล์
          </Button>
          <Button
            variant="soft"
            onClick={() => share(`โปรไฟล์ ${state.name} @${state.handle}`, toast)}
          >
            แชร์โปรไฟล์
          </Button>
        </div>
      </Card>
      <div className="pj-chips">
        {["โพสต์", "บันทึก", "ถูกใจ"].map((t) => (
          <Button
            key={t}
            variant={tab === t ? "primary" : "soft"}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      <div className="pj-profile-grid">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} navigate={navigate} />
        ))}
      </div>
      {!posts.length && (
        <Card>
          <p>ยังไม่มีเรื่องราวในแท็บนี้ เก็บเรื่องที่ทำให้ใจสบายไว้ได้เสมอ</p>
          <Button onClick={() => navigate("community")}>สำรวจเรื่องราว</Button>
        </Card>
      )}
      {edit && (
        <Modal title="พื้นที่ที่เป็นคุณ" onClose={() => setEdit(false)}>
          <Input
            label="ชื่อที่แสดง"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
          <TextArea label="แนะนำตัว" value={bio} onChange={setBio} />
          <Button
            disabled={!name.trim()}
            onClick={() => {
              update((s) => ({ ...s, name: name.trim(), bio }))
              setEdit(false)
              toast("บันทึกโปรไฟล์แล้ว")
            }}
          >
            บันทึกการเปลี่ยนแปลง
          </Button>
        </Modal>
      )}
    </div>
  )
}
function Search({ navigate, initial = "" }: { navigate: Navigate; initial?: string }) {
  const { state, update, toast } = useStore()
  const [query, setQuery] = useState(initial)
  const [tab, setTab] = useState("โพสต์")
  const q = query.trim().toLowerCase()
  const isMine = (handle: string) => handle === state.handle
  const posts = state.posts.filter((p) => {
    if (!`${p.text} ${p.category}`.toLowerCase().includes(q)) return false
    if (state.hiddenPosts.includes(p.id)) return false
    if (p.visibility === "เฉพาะฉัน" && !isMine(p.handle)) return false
    if (
      p.visibility === "ผู้ติดตาม" &&
      !isMine(p.handle) &&
      !state.following.includes(p.handle)
    )
      return false
    if (state.blocked.includes(p.handle)) return false
    if (state.mutedAccounts.includes(p.handle)) return false
    if (state.mutedWords.some((w) => w && p.text.includes(w))) return false
    if (
      state.aiFilter &&
      moderateText(p.text, state.aiSensitivity).action === "block"
    )
      return false
    return true
  })
  const users = [
    ...new Map(
      state.posts
        .filter((p) => p.handle !== state.handle)
        .map((p) => [p.handle, p]),
    ).values(),
  ].filter(
    (p) =>
      `${p.author} ${p.handle}`.toLowerCase().includes(q) &&
      !state.blocked.includes(p.handle),
  )
  const tags = [
    ...new Set(state.posts.flatMap((p) => p.text.match(/#[^\s#]+/g) || [])),
  ].filter((t) => t.toLowerCase().includes(q))
  return (
    <div className="pj-stack">
      <Title sub="ค้นพบสิ่งที่สนใจ ไม่ต้องตามกระแส">ค้นหาเรื่องที่อยากรู้</Title>
      <Input
        label="ค้นหาผู้คน เรื่องราว หรือแฮชแท็ก"
        placeholder="ค้นหาเรื่องที่อยากรู้..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Card>
        <p className="pj-overline">บทสนทนาที่กำลังเติบโต</p>
        <div className="pj-chips">
          {["#ธรรมชาติ", "#หนังสือ", "#พักใจ", "#อาหาร"].map((t) => (
            <Button key={t} variant="soft" onClick={() => setQuery(t)}>
              {t}
            </Button>
          ))}
        </div>
      </Card>
      <div className="pj-chips">
        {["โพสต์", "ผู้คน", "แฮชแท็ก"].map((t) => (
          <Button
            key={t}
            variant={tab === t ? "primary" : "soft"}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      {tab === "โพสต์" &&
        posts.map((p) => <PostCard key={p.id} post={p} navigate={navigate} />)}
      {tab === "ผู้คน" &&
        users.map((p) => (
          <Card key={p.handle}>
            <div className="pj-person">
              <Avatar name={p.author} />
              <div>
                <strong>{p.author}</strong>
                <p>@{p.handle}</p>
              </div>
            </div>
            <p>{p.text}</p>
            <div className="pj-actions">
              {state.following.includes(p.handle) ? (
                <Button
                  variant="soft"
                  onClick={() => {
                    update((s) => ({
                      ...s,
                      following: s.following.filter((h) => h !== p.handle),
                    }))
                    toast(`เลิกติดตาม @${p.handle} แล้ว`)
                  }}
                >
                  <Check size={15} /> ติดตามอยู่
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    update((s) => ({
                      ...s,
                      following: [...new Set([...s.following, p.handle])],
                    }))
                    toast(`ติดตาม @${p.handle} แล้ว`)
                  }}
                >
                  <Plus size={15} /> ติดตาม
                </Button>
              )}
              <Button
                variant="soft"
                onClick={() => {
                  update((s) => ({
                    ...s,
                    mutedAccounts: [...s.mutedAccounts, p.handle],
                  }))
                  toast("ซ่อนเรื่องราวจากบัญชีนี้แล้ว")
                }}
              >
                ปิดเสียง
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  update((s) => ({ ...s, blocked: [...s.blocked, p.handle] }))
                  toast("บล็อกบัญชีแล้ว ยกเลิกได้ในการตั้งค่า")
                }}
              >
                บล็อก
              </Button>
            </div>
          </Card>
        ))}
      {tab === "แฮชแท็ก" &&
        tags.map((t) => (
          <Button
            key={t}
            variant="soft"
            onClick={() => {
              setQuery(t)
              setTab("โพสต์")
            }}
          >
            {t}
          </Button>
        ))}
      {(tab === "โพสต์" ? posts : tab === "ผู้คน" ? users : tags).length === 0 && (
        <Card>
          <p>ไม่พบผลลัพธ์ ลองค้นหาด้วยคำอื่นนะ</p>
        </Card>
      )}
    </div>
  )
}
function Notifications({ navigate }: { navigate: Navigate }) {
  const { state, update } = useStore()
  const [filter, setFilter] = useState("ทั้งหมด")
  const types = [
    ...new Set(["ความคิดเห็น", "ถูกใจ", "ติดตาม", ...state.notifications.map((n) => n.type)]),
  ]
  return (
    <div className="pj-stack">
      <Title sub="กลับมาอ่านได้เมื่อคุณพร้อม">การแจ้งเตือน</Title>
      <div className="pj-chips">
        {["ทั้งหมด", ...types].map((t) => (
          <Button
            key={t}
            variant={filter === t ? "primary" : "soft"}
            onClick={() => setFilter(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      <Button
        variant="ghost"
        onClick={() =>
          update((s) => ({
            ...s,
            notifications: s.notifications.map((n) => ({ ...n, read: true })),
          }))
        }
      >
        ทำเครื่องหมายว่าอ่านทั้งหมด
      </Button>
      {types
        .filter((t) => filter === "ทั้งหมด" || filter === t)
        .map((t) => (
          <Card key={t}>
            <Title>{t}</Title>
            {state.notifications
              .filter((n) => n.type === t)
              .map((n) => (
                <Button
                  key={n.id}
                  variant="ghost"
                  className="pj-notification"
                  onClick={() => {
                    update((s) => ({
                      ...s,
                      notifications: s.notifications.map((v) =>
                        v.id === n.id ? { ...v, read: true } : v,
                      ),
                    }))
                    if (n.post) navigate("article", n.post)
                    else navigate("search")
                  }}
                >
                  <span className={n.read ? "pj-dot-read" : "pj-dot"} />
                  {n.text}
                </Button>
              ))}
            {!state.notifications.some((n) => n.type === t) && (
              <p>ยังไม่มีการแจ้งเตือนในหมวดนี้</p>
            )}
          </Card>
        ))}
    </div>
  )
}
function Messages() {
  const { state, update } = useStore()
  const [person, setPerson] = useState("มะลิ")
  const [text, setText] = useState("")
  const [mobileChat, setMobileChat] = useState(false)
  const people = ["มะลิ", "ต้น"]
  const replied = useRef<Set<string>>(new Set())
  // Demo presence: the other side answers gently once per message you send.
  useEffect(() => {
    const last = [...state.messages].reverse().find((m) => m.person === person)
    if (!last || !last.mine || replied.current.has(last.id)) return
    replied.current.add(last.id)
    const gentle = [
      "ขอบคุณที่เล่าให้ฟังนะ ดีใจที่วันนี้มีเรื่องเล็ก ๆ ให้ยิ้มได้",
      "อ่านแล้วใจเบาลงเลย ไว้มาเล่าอีกนะ ไม่ต้องรีบ",
      "เป็นกำลังใจให้นะ ค่อย ๆ ไปในจังหวะของตัวเองได้เลย",
    ]
    const id = window.setTimeout(() => {
      update((s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            id: crypto.randomUUID(),
            person,
            text: gentle[Math.floor(Math.random() * gentle.length)],
            mine: false,
          },
        ],
      }))
    }, 3500)
    return () => window.clearTimeout(id)
  }, [state.messages, person, update])
  return (
    <div className="pj-stack">
      <Title sub="บทสนทนาที่ไม่ต้องตอบทันที">ข้อความส่วนตัว</Title>
      <div className="pj-chat-layout">
        <Card
          className={
            mobileChat ? "pj-chat-list pj-mobile-hidden" : "pj-chat-list"
          }
        >
          {people.map((p) => (
            <Button
              key={p}
              variant={person === p ? "soft" : "ghost"}
              onClick={() => {
                setPerson(p)
                setMobileChat(true)
              }}
            >
              <Avatar name={p} />
              <span>
                <strong>{p}</strong>
                <span className="pj-caption">
                  {state.messages.filter((m) => m.person === p).at(-1)?.text}
                </span>
              </span>
            </Button>
          ))}
        </Card>
        <Card className={!mobileChat ? "pj-chat pj-mobile-hidden" : "pj-chat"}>
          <div className="pj-row">
            <Button
              variant="ghost"
              className="md:hidden"
              aria-label="กลับไปบทสนทนา"
              onClick={() => setMobileChat(false)}
            >
              <ArrowLeft size={18} />
            </Button>
            <div className="pj-person">
              <Avatar name={person} />
              <strong>{person}</strong>
            </div>
          </div>
          <div className="pj-bubbles">
            {state.messages
              .filter((m) => m.person === person)
              .map((m) => (
                <p
                  key={m.id}
                  className={m.mine ? "pj-bubble mine" : "pj-bubble"}
                >
                  {m.text}
                </p>
              ))}
          </div>
          {state.dm === "ไม่มีใคร" ? (
            <p>คุณปิดข้อความส่วนตัวอยู่ เปลี่ยนได้ในการตั้งค่า</p>
          ) : (
            <>
              <Input
                label="ข้อความ"
                value={text}
                placeholder="เขียนข้อความด้วยความใส่ใจ..."
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.nativeEvent.isComposing &&
                    text.trim()
                  ) {
                    update((s) => ({
                      ...s,
                      messages: [
                        ...s.messages,
                        {
                          id: crypto.randomUUID(),
                          person,
                          text: text.trim(),
                          mine: true,
                        },
                      ],
                    }))
                    setText("")
                  }
                }}
              />
              <Button
                disabled={!text.trim()}
                onClick={() => {
                  update((s) => ({
                    ...s,
                    messages: [
                      ...s.messages,
                      {
                        id: crypto.randomUUID(),
                        person,
                        text: text.trim(),
                        mine: true,
                      },
                    ],
                  }))
                  setText("")
                }}
              >
                <Send size={16} />
                ส่งข้อความ
              </Button>
            </>
          )}
          <p className="pj-caption">
            บทสนทนาตัวอย่าง เก็บเฉพาะในเบราว์เซอร์นี้ • อีกฝ่ายตอบกลับอัตโนมัติแบบสุภาพ
          </p>
        </Card>
      </div>
    </div>
  )
}
function Wellbeing() {
  const { state, update } = useStore()
  return (
    <div className="pj-stack">
      <Title sub="เทคโนโลยีที่เว้นที่ว่างให้ชีวิต">ดูแลใจของคุณ</Title>
      <Card className="pj-time">
        <Clock size={28} />
        <p>เวลาที่ใช้วันนี้</p>
        <strong>
          {state.minutes}
          <small> นาที</small>
        </strong>
        <p>นับเฉพาะเวลาที่เปิดแท็บนี้ วันนี้เริ่มใหม่ได้เสมอ</p>
        <progress
          value={Math.min(state.minutes, state.limit)}
          max={state.limit}
          aria-label="เวลาที่ใช้เทียบกับเป้าหมายรายวัน"
        />
      </Card>
      <Card>
        <Input
          label="เป้าหมายเวลารายวัน (นาที)"
          type="number"
          min="1"
          max="240"
          value={state.limit}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (n >= 1 && n <= 240) update((s) => ({ ...s, limit: n }))
          }}
        />
        <p className="pj-caption">
          เมื่อถึงเวลา เราจะเตือนอย่างอ่อนโยน คุณเลือกใช้งานต่อได้ ไม่มีการล็อก
        </p>
        <Toggle
          label="Quiet Mode — ลดสีและการเคลื่อนไหว"
          checked={state.quiet}
          onChange={(quiet) => update((s) => ({ ...s, quiet }))}
        />
        <Toggle
          label="เปิดช่วงเวลาสงบอัตโนมัติ"
          checked={state.quietHours}
          onChange={(quietHours) => update((s) => ({ ...s, quietHours }))}
        />
        <div className="pj-two">
          <Input
            label="เริ่มเวลา"
            type="time"
            value={state.quietStart}
            onChange={(e) =>
              update((s) => ({ ...s, quietStart: e.target.value }))
            }
          />
          <Input
            label="สิ้นสุดเวลา"
            type="time"
            value={state.quietEnd}
            onChange={(e) =>
              update((s) => ({ ...s, quietEnd: e.target.value }))
            }
          />
        </div>
      </Card>
      <Card className="pj-focus">
        <Title sub="วางสิ่งที่กำลังทำ แล้วกลับมาหาลมหายใจ">พักใจ 10 นาที</Title>
        <FocusTimer onBack={() => {}} />
      </Card>
    </div>
  )
}
function Preferences({ navigate }: { navigate: Navigate }) {
  const { state, update, reset, toast } = useStore()
  const [word, setWord] = useState("")
  const [account, setAccount] = useState("")
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="pj-stack">
      <Title sub="เลือกขอบเขตที่ทำให้คุณรู้สึกปลอดภัย">ตั้งค่าพื้นที่ของคุณ</Title>
      <Card>
        <Title>ความเป็นส่วนตัว</Title>
        <Toggle
          label="บัญชีส่วนตัว"
          checked={state.privateAccount}
          onChange={(privateAccount) =>
            update((s) => ({ ...s, privateAccount }))
          }
        />
        <Toggle
          label="ซ่อนจำนวนถูกใจและผู้ติดตาม"
          checked={state.hideCounts}
          onChange={(hideCounts) => update((s) => ({ ...s, hideCounts }))}
        />
        <Select
          label="ใครแสดงความคิดเห็นได้"
          value={state.comments}
          onChange={(comments) => update((s) => ({ ...s, comments }))}
          options={["ทุกคน", "ผู้ติดตาม", "ไม่มีใคร"]}
        />
        <Select
          label="ใครส่งข้อความได้"
          value={state.dm}
          onChange={(dm) => update((s) => ({ ...s, dm }))}
          options={["ทุกคน", "คนที่ติดตาม", "ไม่มีใคร"]}
        />
        <p className="pj-caption">
          สิทธิ์ผู้ติดตามเป็นการตั้งค่าตัวอย่าง ยังไม่มีระบบยืนยันตัวตนหรือบังคับสิทธิ์ฝั่งเซิร์ฟเวอร์
        </p>
      </Card>
      <Card>
        <Title sub="กรองข่าวร้ายและความรุนแรงก่อนถึงตาคุณ ทำงานบนอุปกรณ์นี้ ไม่ส่งข้อความออกไปไหน">
          AI คัดกรองเนื้อหา
        </Title>
        <Toggle
          label="เปิด AI คัดกรอง"
          checked={state.aiFilter}
          onChange={(aiFilter) => update((s) => ({ ...s, aiFilter }))}
        />
        <p className="pj-overline">ความเข้มงวด</p>
        <div className="pj-chips">
          {(
            [
              ["gentle", "อ่อนโยน"],
              ["balanced", "สมดุล"],
              ["strict", "เข้มงวด"],
            ] as const
          ).map(([v, label]) => (
            <Button
              key={v}
              variant={state.aiSensitivity === v ? "primary" : "soft"}
              onClick={() => update((s) => ({ ...s, aiSensitivity: v }))}
            >
              {label}
            </Button>
          ))}
        </div>
        <p className="pj-caption">
          โหมดเข้มงวดจะพับแม้แต่พาดหัวเร่งเร้า โหมดอ่อนโยนจะเตือนเฉพาะเรื่องรุนแรงชัดเจน
          เรื่องเกี่ยวกับการทำร้ายตัวเองจะถูกพักไว้เสมอ พร้อมช่องทางขอความช่วยเหลือ
        </p>
      </Card>
      <Card>
        <Title>กำลังติดตาม ({state.following.length})</Title>
        {!state.following.length && <p>ยังไม่ได้ติดตามใคร ค้นหาผู้คนแล้วกดติดตามได้เลย</p>}
        {state.following.map((h) => (
          <div className="pj-row" key={h}>
            <p>@{h}</p>
            <Button
              variant="ghost"
              onClick={() =>
                update((s) => ({
                  ...s,
                  following: s.following.filter((v) => v !== h),
                }))
              }
            >
              เลิกติดตาม
            </Button>
          </div>
        ))}
      </Card>
      <Card>
        <Title>โพสต์ที่รายงาน/ซ่อนไว้ ({state.hiddenPosts.length})</Title>
        {!state.hiddenPosts.length && <p>ไม่มีโพสต์ที่ซ่อนไว้</p>}
        {state.hiddenPosts.map((id) => (
          <div className="pj-row" key={id}>
            <p>{id.slice(0, 8)}…</p>
            <Button
              variant="soft"
              onClick={() =>
                update((s) => ({
                  ...s,
                  hiddenPosts: s.hiddenPosts.filter((v) => v !== id),
                }))
              }
            >
              เลิกซ่อน
            </Button>
          </div>
        ))}
      </Card>
      <Card>
        <Title>สิ่งที่ไม่อยากเห็น</Title>
        <Input
          label="คำที่ต้องการปิดเสียง"
          value={word}
          onChange={(e) => setWord(e.target.value)}
        />
        <Button
          variant="soft"
          disabled={!word.trim()}
          onClick={() => {
            update((s) => ({
              ...s,
              mutedWords: [...new Set([...s.mutedWords, word.trim()])],
            }))
            setWord("")
          }}
        >
          เพิ่มคำ
        </Button>
        <div className="pj-chips">
          {state.mutedWords.map((w) => (
            <Button
              key={w}
              variant="soft"
              onClick={() =>
                update((s) => ({
                  ...s,
                  mutedWords: s.mutedWords.filter((v) => v !== w),
                }))
              }
            >
              {w} · ยกเลิก
            </Button>
          ))}
        </div>
        <Input
          label="บัญชีที่ต้องการปิดเสียง (เช่น mali.garden)"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />
        <Button
          variant="soft"
          disabled={!account.trim()}
          onClick={() => {
            update((s) => ({
              ...s,
              mutedAccounts: [
                ...new Set([
                  ...s.mutedAccounts,
                  account.trim().replace(/^@/, ""),
                ]),
              ],
            }))
            setAccount("")
          }}
        >
          ปิดเสียงบัญชี
        </Button>
        {state.mutedAccounts.map((a) => (
          <div className="pj-row" key={a}>
            <p>@{a}</p>
            <Button
              variant="ghost"
              onClick={() =>
                update((s) => ({
                  ...s,
                  mutedAccounts: s.mutedAccounts.filter((v) => v !== a),
                }))
              }
            >
              เปิดเสียง
            </Button>
          </div>
        ))}
      </Card>
      <Card>
        <Title>บัญชีที่บล็อก</Title>
        {!state.blocked.length && <p>ยังไม่มีบัญชีที่บล็อก เลือกบล็อกจากผลค้นหาผู้คนได้</p>}
        {state.blocked.map((a) => (
          <div className="pj-row" key={a}>
            <p>@{a}</p>
            <Button
              variant="soft"
              onClick={() =>
                update((s) => ({
                  ...s,
                  blocked: s.blocked.filter((v) => v !== a),
                }))
              }
            >
              เลิกบล็อก
            </Button>
          </div>
        ))}
      </Card>
      <Card>
        <Title>ข้อมูลของคุณ</Title>
        <p>ต้นแบบนี้เก็บข้อมูลบนอุปกรณ์ของคุณเท่านั้น AI คัดกรองทำงานบนอุปกรณ์นี้เช่นกัน ไม่ส่งข้อความของคุณออกไปไหน</p>
        <div className="pj-actions">
          <Button
            variant="soft"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(state, null, 2)], {
                  type: "application/json",
                }),
              )
              const a = document.createElement("a")
              a.href = url
              a.download = "pakjai-data.json"
              a.click()
              URL.revokeObjectURL(url)
              toast("ดาวน์โหลดข้อมูลแล้ว")
            }}
          >
            ดาวน์โหลดข้อมูล
          </Button>
          <Button variant="ghost" onClick={() => setConfirm(true)}>
            ลบบัญชีต้นแบบ
          </Button>
        </div>
      </Card>
      {confirm && (
        <Modal title="ยืนยันลบบัญชีและข้อมูล?" onClose={() => setConfirm(false)}>
          <p>โปรไฟล์ โพสต์ ข้อความ และการตั้งค่าบนอุปกรณ์นี้จะถูกลบและไม่สามารถกู้คืนได้</p>
          <div className="pj-actions">
            <Button variant="soft" onClick={() => setConfirm(false)}>
              เก็บบัญชีไว้
            </Button>
            <Button
              onClick={async () => {
                if (isCloud) {
                  await services.auth.signOut()
                  setConfirm(false)
                  toast("ออกจากระบบแล้ว ข้อมูลบนเซิร์ฟเวอร์ยังอยู่ ติดต่อแอดมินหากต้องการลบถาวร")
                  navigate("onboarding")
                  return
                }
                for (const key of Object.keys(localStorage))
                  if (key.startsWith("pakjai-")) localStorage.removeItem(key)
                reset()
                setConfirm(false)
                toast("ลบข้อมูลบัญชีต้นแบบแล้ว")
                navigate("onboarding")
              }}
            >
              ยืนยันลบบัญชี
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
function Onboarding({ navigate }: { navigate: Navigate }) {
  const { state, update, toast } = useStore()
  const [step, setStep] = useState(0)
  const [login, setLogin] = useState(false)
  const [name, setName] = useState(state.joined ? state.name : "")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [selected, setSelected] = useState(state.interests)
  const [mood, setMood] = useState("ธรรมชาติ")
  const [busy, setBusy] = useState(false)
  const [authError, setAuthError] = useState("")
  const submitAuth = async () => {
    if (
      (!login && !name.trim()) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
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
  return (
    <div className="pj-stack">
      <Card className="pj-welcome">
        <Leaf size={36} />
        <Title sub="พื้นที่เล็ก ๆ สำหรับชีวิตที่ไม่ต้องรีบ">ยินดีต้อนรับสู่พักใจ</Title>
        <p>ธรรมชาติ ความรู้ และผู้คนที่พร้อมเติบโตไปด้วยกัน</p>
      </Card>
      <Card>
        <p className="pj-overline">ก้าวที่ {step + 1} จาก 3</p>
        {step === 0 ? (
          <>
            <Title>{login ? "กลับมาพักใจ" : "เริ่มต้นในจังหวะของคุณ"}</Title>
            <p className="pj-caption">
              {isCloud
                ? "บัญชีจริงของชุมชนพักใจ เก็บอย่างปลอดภัยบน Supabase"
                : "บัญชีสาธิตในเบราว์เซอร์ ไม่ใช่การสมัครหรือเข้าสู่ระบบจริง กรุณาอย่าใช้รหัสผ่านจริง"}
            </p>
            {!login && (
              <Input
                label="ชื่อที่อยากให้เรียก"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <Input
              label="อีเมลตัวอย่าง"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="palin@example.com"
            />
            <Input
              label="รหัสผ่านตัวอย่าง (อย่างน้อย 6 ตัว)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="pj-actions">
              <Button
                disabled={
                  busy ||
                  (!login && !name.trim()) ||
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
                  password.length < 6
                }
                onClick={submitAuth}
              >
                {busy ? "รอสักครู่..." : login ? (isCloud ? "เข้าสู่ระบบ" : "เข้าสู่บัญชีสาธิต") : "ไปต่อ"}
              </Button>
              <Button variant="ghost" onClick={() => { setLogin(!login); setAuthError("") }}>
                {login ? (isCloud ? "สมัครสมาชิกใหม่" : "สร้างบัญชีสาธิต") : "มีบัญชีอยู่แล้ว"}
              </Button>
            </div>
            {authError && <p className="pj-caption">{authError}</p>}
          </>
        ) : step === 1 ? (
          <>
            <Title sub="เลือกได้หลายอย่าง และเปลี่ยนได้เสมอ">อะไรทำให้คุณรู้สึกดี?</Title>
            <div className="pj-chips">
              {interests.map((i) => (
                <Button
                  key={i}
                  variant={selected.includes(i) ? "primary" : "soft"}
                  aria-pressed={selected.includes(i)}
                  onClick={() =>
                    setSelected((s) =>
                      s.includes(i) ? s.filter((v) => v !== i) : [...s, i],
                    )
                  }
                >
                  {i}
                </Button>
              ))}
            </div>
            <div className="pj-actions">
              <Button variant="soft" onClick={() => setStep(0)}>
                ย้อนกลับ
              </Button>
              <Button disabled={!selected.length} onClick={() => setStep(2)}>
                เลือกอารมณ์วันนี้
              </Button>
            </div>
          </>
        ) : (
          <>
            <Title>วันนี้อยากพักใจแบบไหน?</Title>
            <Select
              label="สิ่งที่ใจต้องการวันนี้"
              value={mood}
              onChange={setMood}
              options={interests}
            />
            <div className="pj-actions">
              <Button variant="soft" onClick={() => setStep(1)}>
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
                เริ่มพักใจ
              </Button>
            </div>
          </>
        )}
        <Button variant="ghost" onClick={() => navigate("home")}>
          สำรวจก่อน ยังไม่ต้องสมัคร
        </Button>
      </Card>
    </div>
  )
}
