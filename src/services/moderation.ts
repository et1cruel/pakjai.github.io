// Pakjai local "AI" content filter — rule-based, runs fully on-device.
// Concept: Social Media พักใจ must not show bad news that makes people feel bad.
// No server, so this is a transparent heuristic screener + gentle rephrase coach.
// Heavy/risky stuff (self-harm) always escalates to help resources, never hidden silently.

export type Sensitivity = "gentle" | "balanced" | "strict";
export type ModAction = "allow" | "review" | "block";

export interface ModResult {
  action: ModAction;
  risk: number; // 0-100, higher = more likely to disturb
  calm: number; // 0-100, higher = calmer/softer
  categories: string[];
  reasons: string[];
  flaggedWords: string[];
  suggestion: string | null;
  selfHarm: boolean;
}

export const CATEGORY_LABEL: Record<string, string> = {
  violence: "ความรุนแรง",
  tragedy: "ข่าวร้าย/โศกนาฏกรรม",
  hate: "ถ้อยคำทำร้ายจิตใจ",
  conflict: "ความขัดแย้ง/การเมืองที่ตึงเครียด",
  spam: "โฆษณา/สแปม/ชวนเชื่อ",
  selfharm: "การทำร้ายตัวเอง",
  shock: "พาดหัวช็อก/เร่งเร้า",
  misinfo: "อ้างสรรพคุณเกินจริง",
};

interface Rule {
  cat: keyof typeof CATEGORY_LABEL;
  weight: number;
  words: string[];
}

const RULES: Rule[] = [
  {
    cat: "violence",
    weight: 30,
    words: [
      "ฆ่า", "ฆาตกรรม", "ทำร้าย", "ตบตี", "ยิง", "แทง", "ฟัน", "ข่มขืน",
      "ทุบ", "ศพ", "เลือด", "ระเบิด", "สงคราม", "ก่อการร้าย", "อาวุธ",
      "kill", "murder", "rape", "attack", "bomb", "war", "weapon", "blood",
    ],
  },
  {
    cat: "tragedy",
    weight: 26,
    words: [
      "เสียชีวิต", "ตาย", "อุบัติเหตุ", "ไฟไหม้", "น้ำท่วม", "แผ่นดินไหว",
      "สึนามิ", "โรคระบาด", "ติดเชื้อ", "ผู้เสียชีวิต", "โศกนาฏกรรม",
      "ข่าวร้าย", "สลด", "อนาถ", "ซาก", "died", "death", "accident",
      "disaster", "flood", "earthquake", "pandemic",
    ],
  },
  {
    cat: "hate",
    weight: 24,
    words: [
      "โง่", "ควาย", "เหี้ย", "สัส", "สมน้ำหน้า", "เกลียด", "รังเกียจ",
      "ด่า", "ประจาน", "แฉ", "ดราม่า", "สาป", "ไล่", "ไสหัว",
      "hate", "stupid", "idiot", "dumb",
    ],
  },
  {
    cat: "conflict",
    weight: 18,
    words: [
      "ม็อบ", "ประท้วง", "ชุมนุม", "รัฐประหาร", "เลือกตั้งโกง", "ทุจริต",
      "คอร์รัปชัน", "ฟ้อง", "ขึ้นศาล", "จำคุก", "จับกุม", "ปะทะ",
      "coup", "protest", "corrupt", "scandal",
    ],
  },
  {
    cat: "spam",
    weight: 22,
    words: [
      "โปรโมชัน", "โปรโมชั่น", "ลดราคา", "คลิกเลย", "สมัครเลย", "รวยเร็ว",
      "หวย", "พนัน", "บาคาร่า", "เงินกู้", "กู้ด่วน", "คริปโต", "แจกเงิน",
      "รายได้เสริม", "ทำงานที่บ้าน", "casino", "betting", "lottery",
      "crypto", "loan", "promo", "discount", "click now",
    ],
  },
  {
    cat: "selfharm",
    weight: 100,
    words: [
      "ฆ่าตัวตาย", "อยากตาย", "ไม่อยากอยู่", "ไม่อยากมีชีวิต",
      "กรีดแขน", "ทำร้ายตัวเอง", "จบชีวิต", "ลาโลก",
      "suicide", "kill myself", "self-harm", "selfharm",
    ],
  },
  {
    cat: "shock",
    weight: 14,
    words: [
      "ช็อก", "สะเทือนใจ", "สยอง", "ห้ามพลาด", "แชร์ด่วน", "ด่วนมาก",
      "อึ้งทั้งประเทศ", "ขนลุก", "shock", "shocking", "urgent",
      "breaking",
    ],
  },
  {
    cat: "misinfo",
    weight: 20,
    words: [
      "หายขาด", "หมอไม่บอก", "สมุนไพรวิเศษ", "รักษาได้ทุกโรค",
      "การันตีหาย", "ชัวร์ 100%", "แชร์ก่อนโดนลบ", "ความลับที่หมอปิดบัง",
      "miracle cure", "guaranteed cure", "doctors hate",
    ],
  },
];

const CALM_WORDS = [
  "พักใจ", "สงบ", "สบายใจ", "อบอุ่น", "ขอบคุณ", "กำลังใจ", "น่ารัก",
  "ธรรมชาติ", "ต้นไม้", "สวน", "หนังสือ", "เพลง", "ศิลปะ", "หายใจ",
  "ช้าๆ", "ช้า ๆ", "ยิ้ม", "สุข", "ผ่อนคลาย", "ดีใจ",
];

const THRESHOLDS: Record<Sensitivity, { review: number; block: number }> = {
  gentle: { review: 45, block: 80 },
  balanced: { review: 30, block: 65 },
  strict: { review: 18, block: 45 },
};

export function moderateText(
  raw: string,
  sensitivity: Sensitivity = "balanced",
): ModResult {
  const text = (raw || "").toLowerCase();
  const reasons: string[] = [];
  const flaggedWords: string[] = [];
  const categories: string[] = [];
  let risk = 0;
  let selfHarm = false;

  for (const rule of RULES) {
    const hits = rule.words.filter((w) => w && text.includes(w.toLowerCase()));
    if (hits.length > 0) {
      risk += rule.weight + Math.min(12, (hits.length - 1) * 6);
      categories.push(rule.cat);
      flaggedWords.push(...hits.slice(0, 4));
      if (rule.cat === "selfharm") selfHarm = true;
    }
  }

  // Shouting / urgency heuristics
  const excl = (raw.match(/!/g) || []).length;
  if (excl >= 3) {
    risk += 10;
    reasons.push("ใช้เครื่องหมายตกใจหลายตัว ทำให้รู้สึกเร่งเร้า");
  }
  const capsRuns = raw.match(/[A-Z]{5,}/g);
  if (capsRuns) {
    risk += 8;
    reasons.push("มีตัวพิมพ์ใหญ่ติดกันยาว ดูเหมือนตะโกน");
  }
  if (/(.)\1{4,}/.test(raw)) {
    risk += 6;
    reasons.push("มีตัวอักษรซ้ำยาวเกินไป");
  }
  if (/https?:\/\//.test(raw) && /คลิก|สมัคร|โปร|ลดราคา|รวย/.test(raw)) {
    risk += 12;
    reasons.push("มีลิงก์ชวนคลิกเชิงโฆษณา");
  }
  if (raw.length > 600) risk += 4;

  // Calm score from gentle vocabulary
  const calmHits = CALM_WORDS.filter((w) => text.includes(w)).length;
  const calm = Math.max(0, Math.min(100, 45 + calmHits * 12 - risk / 2));
  risk = Math.max(0, Math.min(100, Math.round(risk)));

  for (const c of categories) {
    const label = CATEGORY_LABEL[c];
    if (label && !reasons.includes(`เข้าข่าย${label}`)) reasons.push(`เข้าข่าย${label}`);
  }
  if (flaggedWords.length > 3) {
    reasons.push(`พบคำที่ควรระวัง ${flaggedWords.length} คำ`);
  }

  const { review, block } = THRESHOLDS[sensitivity];
  let action: ModAction = "allow";
  if (selfHarm || risk >= block) action = "block";
  else if (risk >= review) action = "review";

  let suggestion: string | null = null;
  if (action !== "allow") {
    suggestion =
      "ลองเล่าเป็นความรู้สึกและสิ่งที่ช่วยเยียวยา แทนรายละเอียดเหตุการณ์ เช่น “วันนี้เจอข่าวหนัก ๆ เลยออกมาเดินสวนสิบนาที ใจเบาลงเยอะ” — งดภาพ/รายละเอียดรุนแรง และไม่ต้องแชร์ข่าวร้ายต่อ";
  }

  return {
    action,
    risk,
    calm: Math.round(calm),
    categories: [...new Set(categories)],
    reasons,
    flaggedWords: [...new Set(flaggedWords)].slice(0, 6),
    suggestion,
    selfHarm,
  };
}

export const SELF_HARM_HELP =
  "หากคุณหรือคนใกล้ตัวไม่ปลอดภัย โทร 1669 (ฉุกเฉิน) หรือสายด่วนสุขภาพจิต 1323 (ตลอด 24 ชม.) และชวนคนที่ไว้ใจอยู่เป็นเพื่อนก่อนนะ";
