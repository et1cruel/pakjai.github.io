import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react"
import { Check, X } from "lucide-react"

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "ghost"
}) {
  return (
    <button
      type="button"
      className={`pj-button pj-button-${variant} ${className}`}
      {...props}
    />
  )
}
export function Chip({
  selected = false,
  icon,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`pj-filter ${selected ? "is-selected" : ""}`}
      {...props}
    >
      {selected ? <Check size={14} strokeWidth={2} /> : icon}
      {children}
    </button>
  )
}
export function Input({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="pj-field">
      <span>{label}</span>
      <input {...props} />
    </label>
  )
}
export function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="pj-field">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <label className="pj-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  )
}
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="pj-toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="pj-switch" />
    </label>
  )
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`pj-card ${className}`}>{children}</section>
}
interface TitleProps {
  children: ReactNode
  sub?: string
}
export function Title({ children, sub }: TitleProps) {
  return (
    <div className="pj-title">
      <h1>{children}</h1>
      {sub && <p>{sub}</p>}
    </div>
  )
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="pj-avatar" aria-label={name}>
      {name.slice(0, 1)}
    </span>
  )
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    ref.current?.showModal()
    return () => {
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="pj-modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="pj-row">
        <Title>{title}</Title>
        <Button variant="ghost" aria-label="ปิดหน้าต่าง" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      {children}
    </dialog>
  )
}
