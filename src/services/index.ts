import { localServices } from "./local"
import { supabaseServices } from "./supabase"
import { isCloud } from "../lib/supabase"

export * from "./types"
// Cloud backend when Supabase env is configured, otherwise on-device demo mode.
export const services = isCloud ? supabaseServices : localServices
export { isCloud }
