import {
  Atom,
  BookOpen,
  Cpu,
  HeartPulse,
  Leaf,
  Lightbulb,
  Music,
  Palette,
  PawPrint,
  Soup,
  type LucideProps,
} from "lucide-react"

const map = {
  ธรรมชาติ: Leaf,
  สัตว์: PawPrint,
  ความรู้: Lightbulb,
  สุขภาพ: HeartPulse,
  อาหาร: Soup,
  ศิลปะ: Palette,
  ดนตรี: Music,
  หนังสือ: BookOpen,
  วิทยาศาสตร์: Atom,
  เทคโนโลยี: Cpu,
} as const

export function CategoryIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Icon = map[name as keyof typeof map] ?? Leaf
  return <Icon strokeWidth={1.4} {...props} />
}
