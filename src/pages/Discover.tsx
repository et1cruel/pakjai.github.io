import type { Page } from '../App'
import { interests, useStore } from '../store'
import Cover from '../components/Cover'
import { CategoryIcon } from '../components/icons'

interface Props {
  setPage: (p: Page, id?: string) => void
}

const categories = [
  { label: 'ธรรมชาติ', image: 'https://images.unsplash.com/photo-1785950148328-b8953a91e6fd?w=500&h=320&fit=crop&auto=format', count: 1204 },
  { label: 'สัตว์', image: 'https://images.unsplash.com/photo-1662077534024-480480ecf0ef?w=500&h=320&fit=crop&auto=format', count: 873 },
  { label: 'วิทยาศาสตร์', image: 'https://images.unsplash.com/photo-1765882630221-514aee5ae069?w=500&h=320&fit=crop&auto=format', count: 541 },
  { label: 'สุขภาพ', image: 'https://images.unsplash.com/photo-1769607205777-200684f2cd24?w=500&h=320&fit=crop&auto=format', count: 768 },
  { label: 'อาหาร', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=320&fit=crop&auto=format', count: 1032 },
  { label: 'ศิลปะ', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&h=320&fit=crop&auto=format', count: 422 },
  { label: 'ดนตรี', image: 'https://images.unsplash.com/photo-1678048632153-d961f9c37a48?w=500&h=320&fit=crop&auto=format', count: 319 },
  { label: 'หนังสือ', image: 'https://images.unsplash.com/photo-1765890645919-72c150f2030b?w=500&h=320&fit=crop&auto=format', count: 287 },
  { label: 'เทคโนโลยี', image: 'https://images.unsplash.com/photo-1783359337847-12e28bf90a63?w=500&h=320&fit=crop&auto=format', count: 498 },
  { label: 'ความรู้', image: 'https://images.unsplash.com/photo-1659103874401-279c2c316afc?w=500&h=320&fit=crop&auto=format', count: 921 },
]

const trending = [
  { tag: '#ป่าฝนเขตร้อน', posts: '2.1K' },
  { tag: '#สถาปัตยกรรมสีเขียว', posts: '1.4K' },
  { tag: '#พลังงานสะอาด', posts: '987' },
  { tag: '#สัตว์สงวน', posts: '843' },
  { tag: '#สมาธิ', posts: '756' },
  { tag: '#อาหารเพื่อสุขภาพ', posts: '1.2K' },
]

export default function Discover({ setPage }: Props) {
  const { update } = useStore()
  const openCategory = (label: string) => {
    const known = interests.includes(label)
    if (label === 'อาหาร') return setPage('food')
    if (known) update((s) => ({ ...s, mood: label }))
    setPage(known ? 'community' : 'search', known ? undefined : label)
  }
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-earth mb-2">ค้นพบ</h1>
        <p className="text-muted">สำรวจเนื้อหาที่ดีตามหัวข้อที่คุณชอบ</p>
      </div>

      {/* Trending tags */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-earth mb-4">กำลังนิยม</h2>
        <div className="flex flex-wrap gap-2">
          {trending.map((t) => (
            <button
              key={t.tag}
              onClick={() => setPage('search', t.tag)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md"
              style={{ backgroundColor: '#d8f3dc' }}
            >
              {t.tag}
              <span className="text-xs opacity-70">{t.posts}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Category grid */}
      <section>
        <h2 className="text-lg font-bold text-earth mb-4">หมวดหมู่ทั้งหมด</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => openCategory(cat.label)}
              className="group relative overflow-hidden rounded-3xl text-left shadow-organic"
              style={{ height: i % 5 === 0 ? 220 : 180 }}
            >
              <Cover fill src={cat.image} alt="" category={cat.label} seed={cat.label} imgClassName="transition-transform duration-[1500ms] group-hover:scale-105" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(27,67,50,0.88) 0%, rgba(27,67,50,0.25) 60%, rgba(27,67,50,0.1) 100%)' }} />
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <CategoryIcon name={cat.label} size={24} className="mb-1 text-cream" />
                <span className="text-base font-bold text-cream">{cat.label}</span>
                <span className="text-xs" style={{ color: 'rgba(245,243,238,0.75)' }}>{cat.count.toLocaleString()} เรื่องราว</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
