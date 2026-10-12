import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { services, type Post, type UserData } from "./services"

export type { Post }
export const interests = [
  "ธรรมชาติ",
  "สัตว์",
  "ความรู้",
  "สุขภาพ",
  "อาหาร",
  "ศิลปะ",
  "ดนตรี",
  "หนังสือ",
  "วิทยาศาสตร์",
  "เทคโนโลยี",
]
const initial = {
  name: "ปาลิน ศรีนวล",
  handle: "palin.green",
  bio: "ปลูกต้นไม้ อ่านหนังสือ และเก็บเรื่องเล็ก ๆ ที่ทำให้ใจสบาย",
  joined: false,
  mood: "ทั้งหมด",
  interests: ["ธรรมชาติ", "หนังสือ"],
  quiet: false,
  hideCounts: true,
  privateAccount: false,
  comments: "ทุกคน",
  dm: "ทุกคน",
  limit: 30,
  minutes: 0,
  day: new Date().toLocaleDateString("en-CA"),
  quietStart: "22:00",
  quietEnd: "07:00",
  quietHours: false,
  mutedWords: [] as string[],
  mutedAccounts: [] as string[],
  blocked: [] as string[],
  following: ["mali.garden", "ton.reads"] as string[],
  hiddenPosts: [] as string[],
  aiFilter: true,
  aiSensitivity: "balanced" as "gentle" | "balanced" | "strict",
  messages: [
    {
      id: "1",
      person: "มะลิ",
      text: "วันนี้มีหนังสือเล่มไหนอยากแนะนำไหม?",
      mine: false,
    },
    { id: "2", person: "ต้น", text: "ขอบคุณที่แบ่งปันเรื่องสวนเล็ก ๆ นะ", mine: false },
  ],
  notifications: [
    {
      id: "n1",
      type: "ความคิดเห็น",
      text: "มะลิแสดงความคิดเห็น: แสงเช้าวันนี้สวยมากเลย",
      read: false,
      post: "p1",
    },
    {
      id: "n2",
      type: "ถูกใจ",
      text: "ต้นส่งกำลังใจให้เรื่องที่คุณแบ่งปัน",
      read: false,
      post: "p1",
    },
    {
      id: "n3",
      type: "ติดตาม",
      text: "สวนเล็กของมะลิเริ่มติดตามคุณ",
      read: false,
      post: "",
    },
  ],
  posts: [
    {
      id: "p1",
      author: "ปาลิน ศรีนวล",
      handle: "palin.green",
      text: "เช้านี้ลองวางโทรศัพท์ แล้วนั่งมองต้นไม้ริมหน้าต่างสักห้านาที ได้ยินเสียงนกชัดขึ้นเยอะเลย #พักใจ #ธรรมชาติ",
      category: "ธรรมชาติ",
      warning: false,
      visibility: "สาธารณะ",
      liked: false,
      saved: false,
      reposted: false,
      likes: 12,
      comments: [
        { id: "c1", author: "มะลิ", text: "อยากลองบ้างจัง ขอบคุณที่แบ่งปันนะ" },
      ],
    },
    {
      id: "p2",
      author: "สวนเล็กของมะลิ",
      handle: "mali.garden",
      text: "โหระพาที่ปลูกไว้เริ่มแตกใบใหม่แล้ว ไม่ต้องเติบโตเร็วก็ได้ แค่เติบโตในจังหวะของตัวเอง #สวนเล็ก #ธรรมชาติ",
      category: "ธรรมชาติ",
      warning: false,
      visibility: "สาธารณะ",
      liked: false,
      saved: false,
      reposted: false,
      likes: 24,
      comments: [],
    },
    {
      id: "p3",
      author: "ต้น อ่านช้า ๆ",
      handle: "ton.reads",
      text: "วันนี้อ่านได้แค่สองหน้า แต่เป็นสองหน้าที่ทำให้ยิ้มได้ ใครมีหนังสืออบอุ่นใจมาแนะนำกันได้นะ #หนังสือ #อ่านช้าๆ",
      category: "หนังสือ",
      warning: false,
      visibility: "สาธารณะ",
      liked: false,
      saved: false,
      reposted: false,
      likes: 8,
      comments: [],
    },
    {
      id: "p4",
      author: "ครัวริมหน้าต่าง",
      handle: "slow.kitchen",
      text: "มื้อเย็นง่าย ๆ ข้าวอุ่นกับซุปผัก ใส่เห็ดและเต้าหู้ กินช้า ๆ ให้เวลากับตัวเอง #อาหาร #ครัวเล็ก",
      category: "อาหาร",
      image:
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=500&fit=crop&auto=format",
      warning: false,
      visibility: "สาธารณะ",
      liked: false,
      saved: false,
      reposted: false,
      likes: 16,
      comments: [],
    },
    {
      id: "p5",
      author: "เพื่อนบ้านสี่ขา",
      handle: "soi.paws",
      text: "แมวส้มประจำซอยมานอนตากแดดหน้าร้านกาแฟอีกแล้ว วันนี้เราเลยนั่งเงียบ ๆ ข้างมันสิบนาที ไม่ต้องคุยอะไรกันเลย #สัตว์เลี้ยง #พักใจ",
      category: "สัตว์",
      image:
        "https://images.unsplash.com/photo-1662077534024-480480ecf0ef?w=800&h=500&fit=crop&auto=format",
      warning: false,
      visibility: "สาธารณะ",
      liked: false,
      saved: false,
      reposted: false,
      likes: 31,
      comments: [],
    },
    {
      id: "p6",
      author: "หมอเล็กใจดี",
      handle: "doc.slowhealth",
      text: "เคล็ดลับเล็ก ๆ ก่อนนอน ลองหายใจเข้านับสี่ ผ่อนออกนับหก สามรอบก็พอ ไม่ต้องให้สมบูรณ์แบบ ร่างกายจะค่อย ๆ ผ่อนคลายเอง #สุขภาพ #หายใจ",
      category: "สุขภาพ",
      warning: false,
      visibility: "สาธารณะ",
      liked: false,
      saved: false,
      reposted: false,
      likes: 19,
      comments: [],
    },
    {
      id: "p7",
      author: "ห้องเรียนดาวเหนือ",
      handle: "north.star.class",
      text: "รู้ไหมว่าใบไม้เปลี่ยนสีในฤดูหนาวเพราะคลอโรฟิลล์สลายตัว สีเหลืองและส้มซ่อนอยู่ในใบมาตลอดทั้งปี แค่รอให้ถึงเวลาปรากฏ #วิทยาศาสตร์ #ธรรมชาติ",
      category: "วิทยาศาสตร์",
      warning: false,
      visibility: "สาธารณะ",
      liked: false,
      saved: false,
      reposted: false,
      likes: 27,
      comments: [],
    },
    {
      id: "p8",
      author: "สมุดสีน้ำของแพร",
      handle: "praew.watercolor",
      text: "เช้านี้ลองระบายสีน้ำรูปใบมะม่วง เส้นเบี้ยวนิดหน่อยแต่ชอบมาก การวาดช้า ๆ ทำให้เห็นรายละเอียดของใบที่เคยเดินผ่านทุกวัน #ศิลปะ #สีน้ำ",
      category: "ศิลปะ",
      image:
        "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&h=500&fit=crop&auto=format",
      warning: false,
      visibility: "สาธารณะ",
      liked: false,
      saved: false,
      reposted: false,
      likes: 14,
      comments: [],
    },
    {
      id: "p9",
      author: "เสียงเบา ๆ",
      handle: "soft.sound",
      text: "เปิดเพลงบรรเลงเปียโนคลอตอนล้างจาน เสียงน้ำกับโน้ตเข้ากันดีอย่างน่าประหลาด ทำให้งานบ้านกลายเป็นช่วงพักใจ #ดนตรี #งานบ้านแบบสงบ",
      category: "ดนตรี",
      warning: false,
      visibility: "สาธารณะ",
      liked: false,
      saved: false,
      reposted: false,
      likes: 11,
      comments: [],
    },
    {
      id: "p10",
      author: "มุมอ่านหนังสือริมคลอง",
      handle: "canal.reads",
      text: "ความรู้เล็ก ๆ วันนี้ ต้นไม้ในเมืองช่วยลดอุณหภูมิรอบตัวได้หลายองศา ร่มเงาข้างทางจึงไม่ใช่แค่ความสวยงาม แต่เป็นระบบทำความเย็นของเมือง #ความรู้ #เมืองสีเขียว",
      category: "ความรู้",
      warning: false,
      visibility: "สาธารณะ",
      liked: false,
      saved: false,
      reposted: false,
      likes: 22,
      comments: [],
    },
  ] as Post[],
}
export type State = typeof initial
const today = () => new Date().toLocaleDateString("en-CA")
const Context = createContext<{
  state: State
  update: (fn: (s: State) => State) => void
  toast: (s: string) => void
  reset: () => void
} | null>(null)
export default function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState("")
  const saved = useRef<{ posts?: Post[]; user?: string; joined?: boolean }>({})
  useEffect(() => {
    let cancelled = false
    const reload = () =>
      Promise.all([
        services.posts.list(),
        services.users.get(),
        services.auth.getSession(),
      ])
        .catch(() => [null, null, null] as const)
        .then(([posts, user, auth]) => {
          if (cancelled) return
          setState((s) => {
            const savedUser = (user as Partial<UserData> | null) ?? {}
            const merged = {
              ...s,
              ...savedUser,
              // Defaults for fields added after first save (old localStorage lacks them)
              following: savedUser.following ?? s.following,
              hiddenPosts: savedUser.hiddenPosts ?? [],
              aiFilter: savedUser.aiFilter ?? true,
              aiSensitivity: savedUser.aiSensitivity ?? ("balanced" as const),
              joined: auth?.joined ?? s.joined,
              posts: (posts as Post[] | null) ?? s.posts,
            }
            return merged.day === today()
              ? merged
              : { ...merged, day: today(), minutes: 0 }
          })
          setReady(true)
        })
    reload()
    // Live community updates (cloud only; local mode has no subscribe)
    const off = services.subscribe?.(() => {
      if (!cancelled) reload()
    })
    return () => {
      cancelled = true
      off?.()
    }
  }, [])
  useEffect(() => {
    if (!ready) return
    const { posts, joined, ...user } = state
    const userJson = JSON.stringify(user)
    const jobs: Promise<void>[] = []
    if (saved.current.posts !== posts) jobs.push(services.posts.saveAll(posts))
    if (saved.current.user !== userJson)
      jobs.push(services.users.save(user as UserData))
    if (saved.current.joined !== joined)
      jobs.push(services.auth.setSession({ joined }))
    saved.current = { posts, user: userJson, joined }
    Promise.all(jobs).catch(() =>
      setMessage("พื้นที่จัดเก็บเต็ม ลองใช้รูปภาพขนาดเล็กลง"),
    )
  }, [state, ready])
  useEffect(() => {
    if (!message) return
    const id = setTimeout(() => setMessage(""), 4500)
    return () => clearTimeout(id)
  }, [message])
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible")
        setState((s) => {
          const day = today()
          const minutes = s.day === day ? s.minutes + 1 : 1
          // Real event-driven notice: reaching the daily goal notifies once per day.
          const hitLimit =
            minutes === s.limit &&
            !s.notifications.some((n) => n.id === `limit-${day}`)
          return {
            ...s,
            day,
            minutes,
            notifications: hitLimit
              ? [
                  {
                    id: `limit-${day}`,
                    type: "ดูแลใจ",
                    text: `วันนี้คุณใช้เวลาที่นี่ครบ ${s.limit} นาทีแล้ว พักสายตาสักนิดไหม?`,
                    read: false,
                    post: "",
                  },
                  ...s.notifications,
                ]
              : s.notifications,
          }
        })
    }, 60000)
    return () => clearInterval(id)
  }, [])
  if (!ready) return null
  return (
    <Context.Provider
      value={{
        state,
        update: setState,
        toast: setMessage,
        reset: () =>
          setState({
            ...initial,
            posts: [],
            messages: [],
            notifications: [],
            name: "สมาชิกใหม่",
            handle: "member",
            bio: "",
          }),
      }}
    >
      {children}
      {message && (
        <div role="status" className="pj-toast">
          {message}
        </div>
      )}
    </Context.Provider>
  )
}
export function useStore() {
  const value = useContext(Context)
  if (!value) throw new Error("StoreProvider required")
  return value
}
