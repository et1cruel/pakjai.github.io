import {
  Heart,
  Bookmark,
  Leaf,
  Sparkles,
  Clock,
  ChevronRight,
  Brain,
  Star,
  TreePine,
  Globe,
} from "lucide-react"
import type { Page } from "../App"
import { interests, useStore, type Post } from "../store"
import { SocialFeed } from "./Social"
import Cover from "../components/Cover"
import { CategoryIcon } from "../components/icons"
import { AIFilterIndicator } from "../components/AIGuard"
import FoodWheel from "../components/FoodWheel"
import FocusTimer from "../components/FocusTimer"

interface Props {
  setPage: (p: Page, id?: string) => void
  quietMode: boolean
}

const articles = [
  {
    id: 1,
    category: "ธรรมชาติ",
    title: "เมื่อป่าฝนเขตร้อนเป็นแรงบันดาลใจของสถาปนิกยุคใหม่",
    desc: "นักออกแบบรุ่นใหม่หันมาศึกษาโครงสร้างของป่าเพื่อสร้างเมืองที่หายใจได้จริง",
    image:
      "https://images.unsplash.com/photo-1642846442523-d852165d44a0?w=600&h=400&fit=crop&auto=format",
    source: "Green Future",
    date: "12 ส.ค. 2569",
    hearts: 248,
    large: true,
    catColor: "#d8f3dc",
    catText: "#2d6a4f",
  },
  {
    id: 2,
    category: "สัตว์",
    title: "นกเงือกกลับมาเยือนสวนสาธารณะในกรุงเทพฯ หลัง 30 ปี",
    desc: "สัญญาณดีของระบบนิเวศเมือง",
    image:
      "https://images.unsplash.com/photo-1662077534024-480480ecf0ef?w=600&h=400&fit=crop&auto=format",
    source: "Wild Thailand",
    date: "11 ส.ค. 2569",
    hearts: 312,
    large: false,
    catColor: "#fef3e2",
    catText: "#7e5300",
  },
  {
    id: 3,
    category: "อาหาร",
    title: "10 เมนูผักที่กินแล้วรู้สึกสดชื่นทั้งวัน",
    desc: "เพราะสุขภาพดีไม่ต้องเริ่มจากยา",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop&auto=format",
    source: "Pakjai Food",
    date: "11 ส.ค. 2569",
    hearts: 189,
    large: false,
    catColor: "#fff8e1",
    catText: "#7e5300",
  },
  {
    id: 4,
    category: "ความรู้",
    title: "วิทยาศาสตร์ว่าด้วยเสียงธรรมชาติกับการลดความเครียด",
    desc: "ทำไมเสียงน้ำไหลและนกร้องถึงทำให้ใจสงบ มีงานวิจัยรองรับ",
    image:
      "https://images.unsplash.com/photo-1765882630221-514aee5ae069?w=600&h=400&fit=crop&auto=format",
    source: "Mind Science",
    date: "10 ส.ค. 2569",
    hearts: 403,
    large: true,
    catColor: "#e3f2fd",
    catText: "#1565c0",
  },
  {
    id: 5,
    category: "ธรรมชาติ",
    title: "สวนแนวตั้งที่ใหญ่ที่สุดในเอเชียตะวันออกเฉียงใต้ เปิดแล้ว!",
    desc: "สูง 60 เมตร พื้นที่สีเขียว 8,000 ตร.ม.",
    image:
      "https://images.unsplash.com/photo-1783359337847-12e28bf90a63?w=600&h=400&fit=crop&auto=format",
    source: "Green City",
    date: "9 ส.ค. 2569",
    hearts: 567,
    large: false,
    catColor: "#d8f3dc",
    catText: "#2d6a4f",
  },
  {
    id: 6,
    category: "สุขภาพ",
    title: "เดินป่า 30 นาทีต่อสัปดาห์ ช่วยลดความดันโลหิตได้จริง",
    desc: "งานวิจัยใหม่จาก Chulalongkorn University ยืนยันผล",
    image:
      "https://images.unsplash.com/photo-1769607205777-200684f2cd24?w=600&h=400&fit=crop&auto=format",
    source: "Health Today",
    date: "9 ส.ค. 2569",
    hearts: 221,
    large: false,
    catColor: "#fce4ec",
    catText: "#880e4f",
  },
]

const knowledgeCards = [
  {
    icon: <TreePine size={22} />,
    title: "ต้นไม้สื่อสารกัน",
    fact: 'ต้นไม้ใช้เครือข่าย "Wood Wide Web" ของรากเชื้อราส่งสารอาหารและสัญญาณเตือนภัยให้กัน',
  },
  {
    icon: <Globe size={22} />,
    title: "มหาสมุทรผลิตออกซิเจน",
    fact: "ออกซิเจน 50-80% ที่เราหายใจมาจากสาหร่ายในทะเล ไม่ใช่ต้นไม้บนบก",
  },
  {
    icon: <Star size={22} />,
    title: "แสงดาวเก่าแก่",
    fact: 'ดาวที่เราเห็นคืนนี้บางดวงอาจดับไปแล้วหลายพันปี แสงที่เราเห็นคือ "อดีต" ที่เดินทางมาถึง',
  },
  {
    icon: <Brain size={22} />,
    title: "สมองฝึกได้ตลอดชีวิต",
    fact: "Neuroplasticity พิสูจน์ว่าสมองสร้างเซลล์ประสาทใหม่ได้แม้อายุ 80+ ปี",
  },
]

const natureCards = [
  {
    title: "แสงทองผ่านป่าสน",
    desc: "ยามเช้าในป่าสน เมื่อแสงแรกแทรกผ่านหมอก",
    image:
      "https://images.unsplash.com/photo-1785950148328-b8953a91e6fd?w=700&h=480&fit=crop&auto=format",
    tag: "ป่า",
  },
  {
    title: "หมอกยามรุ่งอรุณ",
    desc: "ภูมิทัศน์ที่แสงอาทิตย์ทะลุหมอกหนา",
    image:
      "https://images.unsplash.com/photo-1765882630221-514aee5ae069?w=700&h=480&fit=crop&auto=format",
    tag: "ธรรมชาติ",
  },
  {
    title: "เมืองในสวน",
    desc: "อาคารที่ถูกห่อหุ้มด้วยพืชพรรณสีเขียวขจี",
    image:
      "https://images.unsplash.com/photo-1659103874401-279c2c316afc?w=700&h=480&fit=crop&auto=format",
    tag: "สถาปัตยกรรม",
  },
]

export default function Home({ setPage, quietMode }: Props) {
  const { state, update } = useStore()
  const mood = state.mood
  const byId = (id: number) => state.posts.find((p) => p.id === `editorial-${id}`)
  const interact = (
    article: (typeof articles)[0],
    action: "open" | "saved" | "liked",
  ) => {
    const id = `editorial-${article.id}`
    update((s) => {
      const previous = s.posts.find((p) => p.id === id)
      const post: Post = previous || {
        id,
        author: article.source,
        handle: article.source.toLowerCase().replace(/ /g, "."),
        text: `${article.title}\n\n${article.desc}\n\nบทความตัวอย่างสำหรับต้นแบบพักใจ ไม่ใช่การยืนยันข้อเท็จจริงหรือคำแนะนำทางสุขภาพ`,
        category: article.category,
        image: article.image,
        warning: false,
        visibility: "สาธารณะ",
        liked: false,
        saved: false,
        reposted: false,
        likes: article.hearts,
        comments: [],
      }
      const next = action === "open" ? post : { ...post, [action]: !post[action] }
      return {
        ...s,
        posts: previous
          ? s.posts.map((p) => (p.id === id ? next : p))
          : [...s.posts, next],
      }
    })
    if (action === "open") setPage("article", id)
  }
  const shown = articles.filter((a) => mood === "ทั้งหมด" || a.category === mood)

  return (
    <div className="w-full">
      {/* ─── 1. Hero ─── */}
      <section className="relative w-full overflow-hidden" style={{ minHeight: "80vh" }}>
        <img
          src="https://images.unsplash.com/photo-1642846442523-d852165d44a0?w=1600&h=900&fit=crop&auto=format"
          alt="เมืองอนาคตที่ปกคลุมด้วยพืชพรรณสีเขียว"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(27,67,50,0.72) 0%, rgba(45,106,79,0.45) 50%, rgba(82,183,136,0.2) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(27,67,50,0.85) 0%, transparent 55%)" }}
        />
        {!quietMode && (
          <div className="animate-leaf-sway absolute right-8 top-16 opacity-60 md:right-24">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden>
              <path
                d="M40 8C40 8 10 28 10 50C10 64.5 23.5 72 40 72C56.5 72 70 64.5 70 50C70 28 40 8 40 8Z"
                fill="rgba(212,237,218,0.4)"
                stroke="rgba(212,237,218,0.6)"
                strokeWidth="1.5"
              />
              <line x1="40" y1="72" x2="40" y2="20" stroke="rgba(212,237,218,0.5)" strokeWidth="1" strokeDasharray="4 3" />
            </svg>
          </div>
        )}
        <div
          className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-16 md:px-8 md:pb-24"
          style={{ minHeight: "80vh" }}
        >
          <div className="animate-fade-in-up max-w-2xl">
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: "rgba(212,237,218,0.22)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(212,237,218,0.4)",
                color: "#d8f3dc",
              }}
            >
              <Leaf size={14} strokeWidth={1.5} />
              พื้นที่สำหรับเรื่องดี ๆ • ต้นแบบการคัดกรอง
              <Sparkles size={13} strokeWidth={1.5} />
            </div>
            <h1 className="mb-4 text-5xl font-bold leading-tight md:text-7xl" style={{ color: "#f5f3ee", letterSpacing: "-0.02em" }}>
              พักใจ
            </h1>
            <p className="mb-3 text-xl font-medium md:text-2xl" style={{ color: "rgba(245,243,238,0.9)" }}>
              พื้นที่ออนไลน์ที่ไม่มีข่าวร้ายมารบกวนใจ
            </p>
            <p className="mb-10 text-base md:text-lg" style={{ color: "rgba(245,243,238,0.72)" }}>
              ธรรมชาติ ความรู้ อาหาร และเรื่องดี ๆ สำหรับวันที่คุณอยากพักจากโลก
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setPage(state.joined ? "community" : "onboarding")}
                className="rounded-full px-7 py-3.5 text-base font-semibold text-earth transition-all duration-300 hover:-translate-y-0.5"
                style={{ backgroundColor: "#f4d166", boxShadow: "0 4px 20px rgba(244,209,102,0.35)" }}
              >
                เริ่มพักใจ
              </button>
              <button
                onClick={() => setPage("discover")}
                className="rounded-full px-7 py-3.5 text-base font-semibold transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  backgroundColor: "rgba(245,243,238,0.15)",
                  backdropFilter: "blur(8px)",
                  color: "#faf9f5",
                  border: "1.5px solid rgba(245,243,238,0.4)",
                }}
              >
                ค้นพบเรื่องดี ๆ
              </button>
            </div>
          </div>
        </div>
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-16"
          style={{ background: "linear-gradient(to bottom, transparent, #f5f3ee)" }}
        />
      </section>

      {/* ─── Mood selector ─── */}
      <section className="mx-auto max-w-6xl px-4 pt-10 md:px-8">
        <div className="mx-auto max-w-xl">
          <AIFilterIndicator />
        </div>
      </section>
      <section id="mood-section" className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-earth md:text-3xl">วันนี้อยากพักใจแบบไหน?</h2>
          <p className="text-muted">เลือกหมวดที่ใจต้องการ เนื้อหาด้านล่างจะปรับตาม</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 md:gap-5" role="group" aria-label="เลือกหมวด">
          {interests.map((m) => {
            const active = mood === m
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => update((s) => ({ ...s, mood: active ? "ทั้งหมด" : m }))}
                className="group flex w-20 flex-col items-center gap-2 md:w-24"
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-full transition-all duration-500 md:h-20 md:w-20 ${
                    active ? "bg-forest text-cream-card shadow-organic" : "bg-leaf text-forest group-hover:bg-sage-pale/60"
                  }`}
                  style={active ? { boxShadow: "0 0 0 4px #d8f3dc" } : undefined}
                >
                  <CategoryIcon name={m} size={28} />
                </span>
                <span className={`text-xs ${active ? "font-semibold text-forest" : "font-medium text-muted"}`}>{m}</span>
              </button>
            )
          })}
        </div>
      </section>

      <SocialFeed navigate={setPage} compact />

      {/* ─── Editorial feed ─── */}
      <section className="mx-auto max-w-6xl px-4 pb-14 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-earth md:text-3xl">เรื่องดี ๆ วันนี้</h2>
            <p className="mt-0.5 text-sm text-muted">
              {mood === "ทั้งหมด" ? "คัดสรรมาเพื่อคุณโดยเฉพาะ" : `หมวด${mood}`}
            </p>
          </div>
          <button
            onClick={() => setPage("discover")}
            className="flex items-center gap-1 text-sm font-medium text-forest transition-all duration-200 hover:gap-2"
          >
            ดูทั้งหมด <ChevronRight size={16} />
          </button>
        </div>
        {shown.length ? (
          <div className="grid auto-rows-[280px] grid-cols-1 gap-5 md:auto-rows-[260px] md:grid-cols-3">
            {shown.map((a) => (
              <ArticleCard
                key={a.id}
                article={a}
                hideCounts={state.hideCounts}
                onOpen={() => interact(a, "open")}
                saved={!!byId(a.id)?.saved}
                liked={!!byId(a.id)?.liked}
                onSave={() => interact(a, "saved")}
                onLike={() => interact(a, "liked")}
                className={a.large ? "md:row-span-2" : ""}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-leaf-pale p-8 text-center">
            <CategoryIcon name={mood} size={28} className="mx-auto mb-2 text-forest" />
            <p className="font-semibold text-earth">ยังไม่มีบทความในหมวด{mood}</p>
            <p className="mb-4 text-sm text-muted">เรากำลังคัดเรื่องดี ๆ ให้เพิ่ม ระหว่างนี้ดูทุกหมวดไปก่อนได้</p>
            <button className="pj-button pj-button-soft" onClick={() => update((s) => ({ ...s, mood: "ทั้งหมด" }))}>
              ดูทุกหมวด
            </button>
          </div>
        )}
      </section>

      {/* ─── Nature ─── */}
      <section className="mx-auto max-w-6xl px-4 pb-14 md:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-earth md:text-3xl">พักสายตากับธรรมชาติ</h2>
          <p className="mt-0.5 text-sm text-muted">ภาพที่ทำให้ใจสงบลงทันที</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {natureCards.map((nc) => (
            <figure key={nc.title} className="group relative h-72 overflow-hidden rounded-3xl shadow-organic">
              <Cover
                fill
                src={nc.image}
                alt={nc.title}
                category="ธรรมชาติ"
                seed={nc.title}
                imgClassName="transition-transform duration-[1500ms] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/80 via-transparent to-transparent" />
              <figcaption className="absolute bottom-0 left-0 right-0 p-5">
                <span className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "rgba(212,237,218,0.25)", color: "#d8f3dc", backdropFilter: "blur(4px)" }}>
                  {nc.tag}
                </span>
                <p className="text-lg font-semibold leading-snug text-cream-card">{nc.title}</p>
                <p className="mt-1 text-sm" style={{ color: "rgba(245,243,238,0.78)" }}>{nc.desc}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ─── Knowledge ─── */}
      <section className="bg-leaf-pale py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-earth md:text-3xl">วันนี้ได้รู้อะไร?</h2>
            <p className="text-muted">เรื่องน่าทึ่งที่คุณอาจยังไม่รู้</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {knowledgeCards.map((k) => (
              <article key={k.title} className="rounded-3xl bg-cream-card p-6 shadow-organic transition-transform duration-500 hover:-translate-y-1">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf text-forest">{k.icon}</div>
                <h3 className="mb-2 font-bold text-earth">{k.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{k.fact}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 2. Food wheel: dark split band ─── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="grid items-center gap-10 rounded-[2rem] bg-forest-deep p-8 md:grid-cols-[1fr_auto] md:gap-16 md:p-14">
          <div className="max-w-md">
            <span className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-sun">
              <CategoryIcon name="อาหาร" size={18} /> วันนี้กินอะไรดี?
            </span>
            <h2 className="mb-3 text-3xl font-bold leading-snug text-cream md:text-4xl">
              หมุนวงล้อ
              <br />
              ให้พักใจช่วยเลือก
            </h2>
            <p className="mb-6 text-sm leading-relaxed" style={{ color: "rgba(245,243,238,0.72)" }}>
              เลือกหมวดที่อยากกิน หรือสุ่มทั้งหมด แล้วลองเมนูที่วงล้อเลือกให้ ถ้าไม่ถูกใจก็หมุนใหม่ได้เสมอ
            </p>
            <button onClick={() => setPage("food")} className="inline-flex items-center gap-1 text-sm font-medium text-cream underline-offset-4 hover:underline">
              ดูเมนูแนะนำเพิ่มเติม <ChevronRight size={16} />
            </button>
          </div>
          <FoodWheel size={250} onDark />
        </div>
      </section>

      {/* ─── 3. Focus: light, centered, narrow ─── */}
      <section className="px-4 pb-20 md:px-8">
        <div className="mx-auto max-w-xl rounded-[2rem] bg-cream-card p-8 text-center shadow-organic md:p-12" style={{ boxShadow: "0 0 0 1px rgba(45,106,79,.1), 0 8px 40px rgba(45,106,79,.07)" }}>
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted">
            <Clock size={16} strokeWidth={1.5} /> Focus Mode
          </div>
          <h2 className="mb-2 text-2xl font-bold text-earth md:text-3xl">พักใจ 10 นาที</h2>
          <p className="mb-8 text-muted">วางโทรศัพท์ หลับตา และฟังเสียงรอบตัว หยุดหรือยกเลิกได้ทุกเมื่อ</p>
          <FocusTimer />
        </div>
      </section>
    </div>
  )
}

function ArticleCard({
  article,
  saved,
  liked,
  onSave,
  onLike,
  className = "",
  hideCounts,
  onOpen,
}: {
  article: (typeof articles)[0]
  saved: boolean
  liked: boolean
  onSave: () => void
  onLike: () => void
  className?: string
  hideCounts: boolean
  onOpen: () => void
}) {
  return (
    <div className={`group relative overflow-hidden rounded-3xl shadow-organic ${className}`}>
      <Cover
        fill
        src={article.image}
        alt=""
        category={article.category}
        seed={article.title}
        imgClassName="transition-transform duration-[1500ms] group-hover:scale-105"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(27,67,50,0.92) 0%, rgba(27,67,50,0.2) 55%, transparent 100%)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: article.catColor, color: article.catText }}>
          <CategoryIcon name={article.category} size={13} />
          {article.category}
        </span>
        <button onClick={onOpen} className="mb-1 block text-left text-sm font-bold leading-snug text-cream-card md:text-base">
          {article.title}
        </button>
        {article.large && (
          <p className="mb-2 text-xs" style={{ color: "rgba(245,243,238,0.78)" }}>{article.desc}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "rgba(245,243,238,0.7)" }}>
            {article.source} · {article.date}
          </span>
          <div className="flex items-center gap-1">
            <button
              aria-label="ส่งกำลังใจ"
              aria-pressed={liked}
              onClick={onLike}
              className="flex items-center gap-1 rounded-full p-1.5 text-xs transition-transform duration-300 hover:scale-110"
            >
              <Heart size={15} strokeWidth={1.5} fill={liked ? "#f5f3ee" : "none"} color="#f5f3ee" />
              {!hideCounts && <span style={{ color: "rgba(245,243,238,0.8)" }}>{article.hearts + (liked ? 1 : 0)}</span>}
            </button>
            <button
              aria-label="บันทึก"
              aria-pressed={saved}
              onClick={onSave}
              className="rounded-full p-1.5 transition-transform duration-300 hover:scale-110"
            >
              <Bookmark size={15} strokeWidth={1.5} fill={saved ? "#f4d166" : "none"} color={saved ? "#f4d166" : "#f5f3ee"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
