import { supabase } from "../lib/supabase"
import { moderateText } from "./moderation"
import type {
  AuthSession,
  Comment,
  Notice,
  Post,
  Services,
  UserData,
} from "./types"

type Row = Record<string, unknown>

// ---------- snapshots for content-based diffing (no redundant writes) ----------
const snapPosts = new Map<
  string,
  { sig: string; owned: boolean; liked: boolean; saved: boolean; reposted: boolean; comments: string[] }
>()
const snapReactions = new Set<string>() // `${postId}:${kind}` owned by me
const snapNoteRead = new Map<string, boolean>()
const snapFollows = new Set<string>()
let myId = ""
let myHandle = ""

const sigOf = (p: Post) =>
  JSON.stringify([p.text, p.category, p.image ?? "", p.warning, p.visibility])

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

async function me() {
  if (myId) return { id: myId, handle: myHandle }
  const { data } = await supabase().auth.getUser()
  const id = data.user?.id ?? ""
  myId = id
  if (id) {
    const { data: prof } = await supabase()
      .from("profiles")
      .select("handle")
      .eq("id", id)
      .maybeSingle()
    myHandle = (prof?.handle as string) ?? ""
  }
  return { id: myId, handle: myHandle }
}

function toPost(row: Row, reactions: Set<string>): Post {
  const id = String(row.id)
  const comments = (Array.isArray(row.comments) ? row.comments : []) as Comment[]
  return {
    id,
    userId: String(row.user_id ?? ""),
    author: String(row.author ?? ""),
    handle: String(row.handle ?? ""),
    text: String(row.text ?? ""),
    category: String(row.category ?? "ธรรมชาติ"),
    image: (row.image as string) || undefined,
    warning: Boolean(row.warning),
    visibility: String(row.visibility ?? "สาธารณะ"),
    liked: reactions.has(`${id}:like`),
    saved: reactions.has(`${id}:save`),
    reposted: reactions.has(`${id}:repost`),
    likes: Number(row.likes ?? 0),
    comments,
  }
}

function snapshotPost(p: Post, owned: boolean) {
  snapPosts.set(p.id, {
    sig: sigOf(p),
    owned,
    liked: p.liked,
    saved: p.saved,
    reposted: p.reposted,
    comments: p.comments.map((c) => c.id),
  })
}

async function loadReactions(uid: string): Promise<Set<string>> {
  const { data } = await supabase()
    .from("reactions")
    .select("post_id,kind")
    .eq("user_id", uid)
  const set = new Set<string>()
  for (const r of (data ?? []) as Row[])
    set.add(`${String(r.post_id)}:${String(r.kind)}`)
  snapReactions.clear()
  for (const k of set) snapReactions.add(k)
  return set
}

const cloudPosts = {
  async list(): Promise<Post[] | null> {
    const { id } = await me()
    if (!id) return null
    const { data, error } = await supabase()
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
    if (error) throw error
    const reactions = await loadReactions(id)
    const posts = ((data ?? []) as Row[]).map((r) => toPost(r, reactions))
    snapPosts.clear()
    for (const p of posts) snapshotPost(p, p.userId === id)
    return posts
  },

  async saveAll(posts: Post[]): Promise<void> {
    const { id, handle } = await me()
    if (!id) return
    const sb = supabase()
    const seen = new Set(posts.map((p) => p.id))

    for (const p of posts) {
      const snap = snapPosts.get(p.id)
      const owned = snap?.owned ?? (!p.userId && p.handle === handle)
      const isNew = !snap

      if (owned) {
        if (isNew) {
          const risk = moderateText(p.text, "balanced").risk
          const { error } = await sb.from("posts").insert({
            id: p.id,
            user_id: id,
            author: p.author,
            handle: p.handle,
            text: p.text,
            category: p.category,
            image: p.image ?? "",
            warning: p.warning,
            visibility: p.visibility,
            risk,
            comments: p.comments,
          })
          if (error) throw error
        } else if (snap.sig !== sigOf(p)) {
          // never write likes/comments here: likes belong to the trigger,
          // comments go through add_comment (atomic, no clobbering)
          const risk = moderateText(p.text, "balanced").risk
          const { error } = await sb
            .from("posts")
            .update({
              text: p.text,
              category: p.category,
              image: p.image ?? "",
              warning: p.warning,
              visibility: p.visibility,
              risk,
            })
            .eq("id", p.id)
          if (error) throw error
        }
      } else {
        // others' posts: only reactions + new comments may change
        const pairs: Array<["like" | "save" | "repost", boolean]> = [
          ["like", p.liked],
          ["save", p.saved],
          ["repost", p.reposted],
        ]
        for (const [kind, on] of pairs) {
          const key = `${p.id}:${kind}`
          const had = snapReactions.has(key)
          if (on && !had) {
            const { error } = await sb
              .from("reactions")
              .insert({ user_id: id, post_id: p.id, kind })
            if (!error) snapReactions.add(key)
          } else if (!on && had) {
            const { error } = await sb
              .from("reactions")
              .delete()
              .eq("user_id", id)
              .eq("post_id", p.id)
              .eq("kind", kind)
            if (!error) snapReactions.delete(key)
          }
        }
      }

      // new comments (mine or others') always go through the atomic RPC
      const knownComments = new Set(snap?.comments ?? [])
      for (const c of p.comments) {
        if (knownComments.has(c.id)) continue
        const { error } = await sb.rpc("add_comment", {
          p_post_id: p.id,
          p_comment: {
            id: c.id,
            text: c.text,
            author: c.author,
            ...(c.parent ? { parent: c.parent } : {}),
          },
        })
        if (error) throw error
      }
      snapshotPost(p, owned)
    }

    // owned posts deleted locally -> delete remotely
    for (const [pid, s] of [...snapPosts]) {
      if (s.owned && !seen.has(pid)) {
        await supabase().from("posts").delete().eq("id", pid)
        snapPosts.delete(pid)
      }
    }
  },
}

const SETTING_KEYS = [
  "quiet",
  "hideCounts",
  "privateAccount",
  "comments",
  "dm",
  "limit",
  "minutes",
  "day",
  "quietStart",
  "quietEnd",
  "quietHours",
  "mutedWords",
  "mutedAccounts",
  "blocked",
  "hiddenPosts",
  "aiFilter",
  "aiSensitivity",
  "messages",
] as const

const cloudUsers = {
  async get(): Promise<UserData | null> {
    const { id } = await me()
    if (!id) return null
    const sb = supabase()
    const [{ data: prof }, { data: follows }, { data: notes }] =
      await Promise.all([
        sb.from("profiles").select("*").eq("id", id).maybeSingle(),
        sb.from("follows").select("handle").eq("follower_id", id),
        sb
          .from("notifications")
          .select("*")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(30),
      ])
    if (!prof) return null
    const p = prof as Row
    const settings = (p.settings ?? {}) as Record<string, unknown>
    const following = (((follows ?? []) as Row[]).map((f) => String(f.handle)))
    snapFollows.clear()
    for (const h of following) snapFollows.add(h)

    const serverNotes: Notice[] = ((notes ?? []) as Row[]).map((n) => ({
      id: String(n.id),
      type: String(n.type),
      text: String(n.text),
      read: Boolean(n.read),
      post: String(n.post_id ?? ""),
    }))
    snapNoteRead.clear()
    for (const n of serverNotes) snapNoteRead.set(n.id, n.read)
    const localNotes = (Array.isArray(settings.localNotes)
      ? settings.localNotes
      : []) as Notice[]

    return {
      name: String(p.name ?? "สมาชิกใหม่"),
      handle: String((p.handle as string) ?? ""),
      bio: String(p.bio ?? ""),
      mood: String(p.mood ?? "ทั้งหมด"),
      interests: (Array.isArray(p.interests) ? p.interests : []) as string[],
      quiet: Boolean(settings.quiet ?? false),
      hideCounts: Boolean(settings.hideCounts ?? true),
      privateAccount: Boolean(settings.privateAccount ?? false),
      comments: String(settings.comments ?? "ทุกคน"),
      dm: String(settings.dm ?? "ทุกคน"),
      limit: Number(settings.limit ?? 30),
      minutes: Number(settings.minutes ?? 0),
      day: String(settings.day ?? new Date().toLocaleDateString("en-CA")),
      quietStart: String(settings.quietStart ?? "22:00"),
      quietEnd: String(settings.quietEnd ?? "07:00"),
      quietHours: Boolean(settings.quietHours ?? false),
      mutedWords: (settings.mutedWords as string[]) ?? [],
      mutedAccounts: (settings.mutedAccounts as string[]) ?? [],
      blocked: (settings.blocked as string[]) ?? [],
      hiddenPosts: (settings.hiddenPosts as string[]) ?? [],
      following,
      aiFilter: Boolean(settings.aiFilter ?? true),
      aiSensitivity: (settings.aiSensitivity as UserData["aiSensitivity"]) ?? "balanced",
      messages: (settings.messages as UserData["messages"]) ?? [],
      notifications: [...serverNotes, ...localNotes],
    }
  },

  async save(user: UserData): Promise<void> {
    const { id } = await me()
    if (!id) return
    const sb = supabase()
    const settings: Record<string, unknown> = {}
    for (const k of SETTING_KEYS) settings[k] = user[k]
    // server notifications live in their own table; only local ones go to settings
    settings.localNotes = user.notifications.filter((n) => !isUuid(n.id))
    await sb.from("profiles").update({
      name: user.name,
      bio: user.bio,
      interests: user.interests,
      mood: user.mood,
      settings,
    }).eq("id", id)

    // follows diff
    const want = new Set(user.following)
    for (const h of want) {
      if (snapFollows.has(h)) continue
      // resolve handle -> user id when possible (seed demo handles stay null)
      const { data } = await sb
        .from("profiles")
        .select("id")
        .eq("handle", h)
        .maybeSingle()
      await sb.from("follows").upsert({
        follower_id: id,
        handle: h,
        following_id: (data?.id as string) ?? null,
      })
      snapFollows.add(h)
    }
    for (const h of [...snapFollows]) {
      if (!want.has(h)) {
        await sb.from("follows").delete().eq("follower_id", id).eq("handle", h)
        snapFollows.delete(h)
      }
    }

    // server notification read-state sync
    for (const n of user.notifications) {
      if (!isUuid(n.id)) continue
      if (snapNoteRead.get(n.id) === n.read) continue
      await sb.from("notifications").update({ read: n.read }).eq("id", n.id)
      snapNoteRead.set(n.id, n.read)
    }
  },
}

function slugHandle(email: string, uid: string) {
  const prefix =
    email.split("@")[0].toLowerCase().replace(/[^a-z0-9._]+/g, "").slice(0, 20) ||
    "member"
  return `${prefix}.${uid.slice(0, 4)}`
}

async function ensureProfile(uid: string, name: string, email: string) {
  const sb = supabase()
  const { data } = await sb.from("profiles").select("id").eq("id", uid).maybeSingle()
  if (data) return
  for (let i = 0; i < 3; i++) {
    const handle = i === 0 ? slugHandle(email, uid) : `${slugHandle(email, uid)}${i}`
    const { error } = await sb.from("profiles").insert({
      id: uid,
      handle,
      name: name || email.split("@")[0],
      interests: ["ธรรมชาติ", "หนังสือ"],
    })
    if (!error) {
      myHandle = handle
      return
    }
  }
  throw new Error("สร้างโปรไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง")
}

const cloudAuth = {
  isCloud: true as const,
  async getSession(): Promise<AuthSession | null> {
    const { data } = await supabase().auth.getSession()
    if (!data.session?.user) return null
    const u = data.session.user
    await ensureProfile(u.id, "", u.email ?? "")
    myId = u.id
    return { joined: true }
  },
  async setSession(): Promise<void> {},
  async signUp(email: string, password: string, name: string): Promise<void> {
    const { data, error } = await supabase().auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    if (data.session?.user) {
      myId = data.session.user.id
      await ensureProfile(myId, name, email)
    } else {
      // email confirmation is ON: user must verify first
      throw new Error(
        "สมัครแล้ว กรุณากดลิงก์ยืนยันในอีเมลก่อน แล้วค่อยเข้าสู่ระบบ (หรือให้แอดมินปิด email confirmation ใน Supabase > Authentication)",
      )
    }
  },
  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await supabase().auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    const u = data.user
    myId = u.id
    await ensureProfile(u.id, "", u.email ?? "")
  },
  async signOut(): Promise<void> {
    await supabase().auth.signOut()
    myId = ""
    myHandle = ""
    snapPosts.clear()
    snapReactions.clear()
    snapNoteRead.clear()
    snapFollows.clear()
  },
}

export const supabaseServices: Services = {
  posts: cloudPosts,
  users: cloudUsers,
  auth: cloudAuth,
  async clearAll(): Promise<void> {
    await cloudAuth.signOut()
  },
  subscribe(cb: () => void): () => void {
    const sb = supabase()
    let timer = 0
    const ping = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(cb, 800)
    }
    const ch = sb
      .channel("pakjai-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, ping)
      .subscribe()
    return () => {
      window.clearTimeout(timer)
      sb.removeChannel(ch)
    }
  },
  async reportPost(postId: string, reason: string): Promise<void> {
    const { error } = await supabase().rpc("report_post", {
      p_post_id: postId,
      p_reason: reason,
    })
    if (error) throw error
  },
}
