import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isCloud = Boolean(url && anon)

let client: SupabaseClient | null = null
export function supabase(): SupabaseClient {
  if (!url || !anon) throw new Error("ยังไม่ได้ตั้งค่า Supabase (.env)")
  if (!client) client = createClient(url, anon)
  return client
}

/** Upload a data-URL/base64 image to the post-images bucket. Returns public URL. */
export async function uploadPostImage(
  dataUrl: string,
  userId: string,
): Promise<string> {
  const sb = supabase()
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.*)$/.exec(dataUrl)
  if (!m) return dataUrl // already a URL
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0))
  const ext = m[1].split("/")[1]?.replace("jpeg", "jpg") ?? "png"
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await sb.storage
    .from("post-images")
    .upload(path, new Blob([bytes], { type: m[1] }), {
      contentType: m[1],
      upsert: false,
    })
  if (error) throw error
  return sb.storage.from("post-images").getPublicUrl(path).data.publicUrl
}
