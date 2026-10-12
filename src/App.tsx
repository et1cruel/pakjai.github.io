import { useEffect, useState } from "react"
import Header from "./components/Header"
import BottomNav from "./components/BottomNav"
import Home from "./pages/Home"
import Discover from "./pages/Discover"
import Food from "./pages/Food"
import Social, { Sidebar, Reminder } from "./pages/Social"
import StoreProvider, { useStore } from "./store"
import { Button } from "./components/ui"

export type Page = "home" | "discover" | "food" | "search" | "profile" | "community" | "create" | "article" | "notifications" | "messages" | "wellbeing" | "settings" | "onboarding"

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
function Shell() {
  const { state, update } = useStore()
  const [page, setPage] = useState<Page>("home")
  const [id, setId] = useState<string>()
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  const inQuietHours =
    state.quietHours &&
    (state.quietStart <= state.quietEnd
      ? time >= state.quietStart && time < state.quietEnd
      : time >= state.quietStart || time < state.quietEnd)
  const quietMode = state.quiet || inQuietHours
  const navigate = (p: Page, postId?: string) => {
    setPage(p)
    setId(postId)
    window.scrollTo({ top: 0, behavior: "instant" })
  }

  return (
    <div
      className={`min-h-screen transition-all duration-700 ${
        quietMode ? "quiet-mode" : ""
      }`}
    >
      <Header
        page={page}
        setPage={navigate}
        quietMode={quietMode}
        setQuietMode={(quiet) =>
          update((s) => ({ ...s, quiet, quietHours: false }))
        }
      />
      <div className="pj-layout">
        <Sidebar page={page} navigate={navigate} />
        <main className="pb-28 md:pb-0 pj-main">
          <Reminder />
          <div className="pj-mobile-tools">
            <ButtonLinks navigate={navigate} />
          </div>
          {page === "home" && <Home setPage={navigate} quietMode={quietMode} />}
          {page === "discover" && <Discover setPage={navigate} />}
          {page === "food" && <Food />}
          {!["home", "discover", "food"].includes(page) && (
            <Social
              key={`${page}-${id || ""}`}
              page={page}
              id={id}
              navigate={navigate}
            />
          )}
        </main>
      </div>
      <BottomNav page={page} setPage={navigate} />
    </div>
  )
}
function ButtonLinks({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <>
      <Button variant="ghost" onClick={() => navigate("community")}>
        พื้นที่ของเรา
      </Button>
      <Button variant="ghost" onClick={() => navigate("messages")}>
        ข้อความ
      </Button>
      <Button variant="ghost" onClick={() => navigate("wellbeing")}>
        ดูแลใจ
      </Button>
      <Button variant="ghost" onClick={() => navigate("settings")}>
        ตั้งค่า
      </Button>
    </>
  )
}
