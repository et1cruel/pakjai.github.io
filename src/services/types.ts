export type Comment = { id: string; text: string; author: string; parent?: string }
export type Post = {
  id: string
  userId?: string
  author: string
  handle: string
  text: string
  category: string
  image?: string
  warning: boolean
  visibility: string
  liked: boolean
  saved: boolean
  reposted: boolean
  likes: number
  comments: Comment[]
}
export type Message = { id: string; person: string; text: string; mine: boolean }
export type Notice = {
  id: string
  type: string
  text: string
  read: boolean
  post: string
}
export type UserData = {
  name: string
  handle: string
  bio: string
  mood: string
  interests: string[]
  quiet: boolean
  hideCounts: boolean
  privateAccount: boolean
  comments: string
  dm: string
  limit: number
  minutes: number
  day: string
  quietStart: string
  quietEnd: string
  quietHours: boolean
  mutedWords: string[]
  mutedAccounts: string[]
  blocked: string[]
  following: string[]
  hiddenPosts: string[]
  aiFilter: boolean
  aiSensitivity: "gentle" | "balanced" | "strict"
  messages: Message[]
  notifications: Notice[]
}
export type AuthSession = { joined: boolean }

export interface PostService {
  list(): Promise<Post[] | null>
  saveAll(posts: Post[]): Promise<void>
}
export interface UserService {
  get(): Promise<UserData | null>
  save(user: UserData): Promise<void>
}
export interface AuthService {
  getSession(): Promise<AuthSession | null>
  setSession(session: AuthSession): Promise<void>
  signOut(): Promise<void>
  /** true when backed by Supabase (real accounts), false in on-device demo mode */
  isCloud?: boolean
  signUp?(email: string, password: string, name: string): Promise<void>
  signIn?(email: string, password: string): Promise<void>
}
export interface Services {
  posts: PostService
  users: UserService
  auth: AuthService
  clearAll(): Promise<void>
  /** Live updates (cloud only). Returns unsubscribe. */
  subscribe?(cb: () => void): () => void
  /** File a community report (cloud: server-counted, hides at 3). */
  reportPost?(postId: string, reason: string): Promise<void>
}
