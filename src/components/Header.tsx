import { useState } from "react"
import { Search, Bell, User, Menu, X, Moon, Sun, Leaf } from "lucide-react"
import type { Page } from "../App"
import { useStore } from "../store"
import Logo from "./Logo"

interface Props {
  page: Page
  setPage: (p: Page) => void
  quietMode: boolean
  setQuietMode: (v: boolean) => void
}

const navLinks: {
  label: string
  page: Page
}[] = [
  { label: "หน้าแรก", page: "home" },
  { label: "ค้นพบ", page: "discover" },
  { label: "อาหาร", page: "food" },
  { label: "ค้นหา", page: "search" },
]

export default function Header({
  page,
  setPage,
  quietMode,
  setQuietMode,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { state } = useStore()
  const unread = state.notifications.filter((n) => !n.read).length

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        backdropFilter: "blur(16px)",
        backgroundColor: "rgba(245,243,238,0.88)",
        borderBottom: "1px solid rgba(45,106,79,0.08)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <button
          onClick={() => setPage("home")}
          className="flex items-center gap-2 group"
          aria-label="Pakjai - กลับหน้าแรก"
        >
          <Logo size={38} />
          <div className="w-2 h-2 rounded-full bg-sun animate-pulse hidden sm:block" />
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <button
              key={l.page}
              onClick={() => setPage(l.page)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${
                  page === l.page
                    ? "bg-forest text-cream-card"
                    : "text-earth-mid hover:bg-leaf hover:text-forest"
                }`}
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Quiet Mode Toggle */}
          <button
            onClick={() => setQuietMode(!quietMode)}
            title={quietMode ? "ปิด Quiet Mode" : "เปิด Quiet Mode"}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300
              ${
                quietMode
                  ? "bg-earth text-cream"
                  : "bg-leaf text-forest hover:bg-sage hover:text-cream-card"
              }`}
          >
            {quietMode ? <Moon size={13} /> : <Leaf size={13} />}
            {quietMode ? "Quiet" : "สงบ"}
          </button>

          <button
            onClick={() => setPage("search")}
            className="w-9 h-9 rounded-full flex items-center justify-center text-earth-mid hover:bg-leaf hover:text-forest transition-all duration-200"
          >
            <Search size={18} />
          </button>
          <button
            onClick={() => setPage("notifications")}
            aria-label="การแจ้งเตือน"
            className="w-9 h-9 rounded-full flex items-center justify-center text-earth-mid hover:bg-leaf hover:text-forest transition-all duration-200 relative"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: "#9e5634", color: "#faf9f5" }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          <button
            onClick={() => setPage("profile")}
            className="w-9 h-9 rounded-full bg-leaf flex items-center justify-center text-forest hover:bg-sage hover:text-cream-card transition-all duration-200"
          >
            <User size={17} />
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-earth-mid hover:bg-leaf transition-all duration-200"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t px-4 py-3 flex flex-col gap-1"
          style={{
            borderColor: "rgba(45,106,79,0.08)",
            backgroundColor: "rgba(245,243,238,0.98)",
          }}
        >
          {navLinks.map((l) => (
            <button
              key={l.page}
              onClick={() => {
                setPage(l.page)
                setMobileOpen(false)
              }}
              className={`text-left px-4 py-2.5 rounded-2xl text-sm font-medium transition-all
                ${
                  page === l.page
                    ? "bg-forest text-cream-card"
                    : "text-earth hover:bg-leaf"
                }`}
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => setQuietMode(!quietMode)}
            className={`mt-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all
              ${quietMode ? "bg-earth text-cream" : "bg-leaf text-forest"}`}
          >
            {quietMode ? <Sun size={14} /> : <Moon size={14} />}
            {quietMode ? "ปิด Quiet Mode" : "เปิด Quiet Mode"}
          </button>
        </div>
      )}
    </header>
  )
}
