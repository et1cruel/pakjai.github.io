import { Leaf } from "lucide-react"
import FoodWheel from "../components/FoodWheel"
import Cover from "../components/Cover"

const featured = [
  { name: "สลัดผักรวมน้ำสลัดงาญี่ปุ่น", note: "เบา สดชื่น เหมาะมื้อกลางวัน", tag: "มีผัก", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=280&fit=crop&auto=format" },
  { name: "ต้มยำน้ำใสใส่เห็ด", note: "ซดร้อน ๆ ตอนฝนตก", tag: "เน้นน้ำ", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=280&fit=crop&auto=format" },
  { name: "ข้าวผัดกะเพราไข่ดาว", note: "มื้อง่าย ๆ ที่อุ่นใจเสมอ", tag: "เน้นข้าว", image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=280&fit=crop&auto=format" },
]

export default function Food() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-earth md:text-4xl">วันนี้กินอะไรดี?</h1>
        <p className="text-muted">บอกอารมณ์อาหาร แล้วให้พักใจช่วยเลือก</p>
      </div>
      <div className="grid items-start gap-10 md:grid-cols-2">
        <FoodWheel size={290} />
        <div>
          <h2 className="mb-4 text-xl font-bold text-earth">เมนูแนะนำประจำวัน</h2>
          <div className="flex flex-col gap-4">
            {featured.map((f) => (
              <article key={f.name} className="flex overflow-hidden rounded-3xl bg-cream-card shadow-organic">
                <Cover src={f.image} alt={f.name} category="อาหาร" seed={f.name} className="h-24 w-28 shrink-0" imgClassName="h-full" />
                <div className="flex flex-col justify-center px-4 py-3">
                  <span className="mb-1.5 inline-block self-start rounded-full bg-leaf px-2 py-0.5 text-xs font-medium text-forest">{f.tag}</span>
                  <p className="text-sm font-bold text-earth">{f.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{f.note}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 flex gap-3 rounded-3xl bg-leaf-pale p-5">
            <Leaf size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-forest" />
            <div>
              <p className="mb-1 text-sm font-semibold text-earth">เคล็ดลับพักใจ</p>
              <p className="text-xs leading-relaxed text-muted">กินช้า ๆ และสังเกตรสชาติของอาหาร ช่วยให้มื้อนั้นน่าจดจำและอิ่มสบายขึ้น</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
