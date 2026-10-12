import { Leaf, Sparkles, ShieldCheck, TriangleAlert, OctagonX } from "lucide-react";
import { useMemo } from "react";
import {
  moderateText,
  SELF_HARM_HELP,
  CATEGORY_LABEL,
  type Sensitivity,
} from "../services/moderation";

export function AIFilterBadge({ text }: { text: string }) {
  const r = useMemo(() => moderateText(text, "balanced"), [text]);
  if (r.action === "allow")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: "#d8f3dc", color: "#2d6a4f" }}>
        <Leaf size={12} /> AI ตรวจแล้ว · อบอุ่นใจได้
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: "#fef9e7", color: "#8a6500" }}>
        <TriangleAlert size={12} /> เนื้อหาอ่อนไหว · อ่านเมื่อพร้อม
      </span>
  );
}

export function AIFilterIndicator() {
  return (
    <div className="flex items-center gap-3 rounded-3xl px-4 py-3" style={{ backgroundColor: "#ecf9ee", border: "1px solid rgba(45,106,79,.14)" }}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#2d6a4f", color: "#faf9f5" }}>
        <Sparkles size={16} />
      </span>
      <div className="text-left">
        <p className="flex items-center gap-1.5 text-sm font-bold text-earth">
          <Leaf size={13} /> AI คัดกรองเนื้อหาให้คุณ
        </p>
        <p className="text-xs text-muted">เราช่วยกรองเนื้อหาที่รบกวนใจออกก่อนที่คุณจะเห็น</p>
      </div>
      <ShieldCheck size={18} className="ml-auto shrink-0 text-forest" />
    </div>
  );
}

export function ModVerdict({
  text,
  sensitivity,
}: {
  text: string;
  sensitivity: Sensitivity;
}) {
  const r = useMemo(
    () => moderateText(text, sensitivity),
    [text, sensitivity],
  );
  if (!text.trim()) return null;
  if (r.action === "allow")
    return (
      <div className="flex items-start gap-2 rounded-2xl p-3 text-sm" style={{ backgroundColor: "#ecf9ee", color: "#2d6a4f" }}>
        <ShieldCheck size={17} className="mt-0.5 shrink-0" />
        <p>ดูอบอุ่นใจดี เผยแพร่ได้เลย (ความสงบ {r.calm}/100)</p>
      </div>
    );
  if (r.action === "block")
    return (
      <div className="flex flex-col gap-2 rounded-2xl p-4 text-sm" style={{ backgroundColor: "#fdecec", color: "#8f1d1d" }}>
        <p className="flex items-center gap-2 font-bold">
          <OctagonX size={17} /> พักใจขอพักเรื่องนี้ไว้ก่อน
        </p>
        <ul className="list-disc pl-5 text-xs leading-relaxed">
          {r.reasons.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        {r.selfHarm && <p className="text-xs font-medium">{SELF_HARM_HELP}</p>}
        {r.suggestion && <p className="text-xs opacity-90">{r.suggestion}</p>}
      </div>
    );
  return (
    <div className="flex flex-col gap-2 rounded-2xl p-4 text-sm" style={{ backgroundColor: "#fef9e7", color: "#6b4e00" }}>
      <p className="flex items-center gap-2 font-bold">
        <TriangleAlert size={17} /> เนื้อหานี้อาจกระทบความรู้สึก
      </p>
      <ul className="list-disc pl-5 text-xs leading-relaxed">
        {r.reasons.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {r.suggestion && <p className="text-xs opacity-90">{r.suggestion}</p>}
      <p className="text-xs opacity-80">
        หมวดที่ตรวจพบ: {r.categories.map((c) => CATEGORY_LABEL[c]).join(" · ")}
      </p>
    </div>
  );
}
