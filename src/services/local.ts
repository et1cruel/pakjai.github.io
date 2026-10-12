import type { Services } from "./types"

const KEYS = {
  posts: "pakjai-posts-v2",
  user: "pakjai-user-v2",
  auth: "pakjai-auth-v2",
  legacy: "pakjai-social-v1",
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}
function legacy(): Record<string, unknown> | null {
  return read(KEYS.legacy)
}

export const localServices: Services = {
  posts: {
    async list() {
      const posts = read<never[]>(KEYS.posts)
      if (posts) return posts
      const old = legacy()
      return (old?.posts as never[]) ?? null
    },
    async saveAll(posts) {
      write(KEYS.posts, posts)
    },
  },
  users: {
    async get() {
      const user = read<never>(KEYS.user)
      if (user) return user
      const old = legacy()
      if (!old) return null
      const { posts: _p, joined: _j, ...rest } = old
      return rest as never
    },
    async save(user) {
      write(KEYS.user, user)
    },
  },
  auth: {
    isCloud: false as const,
    async getSession() {
      const session = read<{ joined: boolean }>(KEYS.auth)
      if (session) return session
      const old = legacy()
      return old ? { joined: Boolean(old.joined) } : null
    },
    async setSession(session) {
      write(KEYS.auth, session)
    },
    async signOut() {
      localStorage.removeItem(KEYS.auth)
    },
  },
  async clearAll() {
    for (const key of Object.keys(localStorage))
      if (key.startsWith("pakjai-")) localStorage.removeItem(key)
  },
}
