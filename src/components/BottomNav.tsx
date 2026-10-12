import { Home, Search, Sparkles, UtensilsCrossed, User } from 'lucide-react'
import type { Page } from '../App'

interface Props {
  page: Page
  setPage: (p: Page) => void
}

const items: { icon: React.ReactNode; label: string; page: Page }[] = [
  { icon: <Home size={20} />, label: 'หน้าแรก', page: 'home' },
  { icon: <Search size={20} />, label: 'ค้นหา', page: 'search' },
  { icon: <Sparkles size={20} />, label: 'ค้นพบ', page: 'discover' },
  { icon: <UtensilsCrossed size={20} />, label: 'อาหาร', page: 'food' },
  { icon: <User size={20} />, label: 'โปรไฟล์', page: 'profile' },
]

export default function BottomNav({ page, setPage }: Props) {
  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden"
      style={{ width: 'calc(100% - 32px)', maxWidth: 400 }}
    >
      <div
        className="flex items-center justify-around rounded-[28px] px-2 py-2"
        style={{
          backgroundColor: 'rgba(245,243,238,0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(45,106,79,0.15), 0 2px 8px rgba(45,106,79,0.08)',
          border: '1px solid rgba(45,106,79,0.1)',
        }}
      >
        {items.map((item) => {
          const active = page === item.page
          return (
            <button
              key={item.page}
              onClick={() => setPage(item.page)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 min-w-0"
              style={{
                color: active ? '#faf9f5' : '#4c685b',
                backgroundColor: active ? '#2d6a4f' : 'transparent',
              }}
            >
              <span className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
