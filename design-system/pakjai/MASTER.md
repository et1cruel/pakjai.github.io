# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Pakjai (พักใจ)
**Generated:** 2026-10-12 (ui-ux-pro-max) · **Adapted:** 2026-10-12 — human override, see deviations
**Category:** Social Media App — calm wellness community (Thai-first)

---

## Deliberate Deviations from Generated System

The generator recommended `Vibrant & Block-based` style with a purple palette
(`#7C3AED`). That was **rejected**: Pakjai's concept is restfulness in nature,
so this file locks the calm forest identity below. Do not reintroduce
high-energy purple/vibrant styling without explicit user approval.

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary (forest) | `#2d6a4f` | `--color-forest` |
| Primary deep | `#1b4332` | `--color-forest-deep` |
| Primary light | `#40916c` | `--color-forest-light` |
| Secondary (sage) | `#52b788` | `--color-sage` |
| CTA / Sun | `#f4d166` | `--color-sun` |
| Background | `#f5f3ee` | `--color-cream` |
| Surface | `#faf9f5` | `--color-cream-card` |
| Soft green tint | `#d8f3dc` | `--color-leaf` |
| Soft green pale | `#ecf9ee` | `--color-leaf-pale` |
| Text | `#1a3326` | `--color-earth` |
| Text mid | `#3a5a48` | `--color-earth-mid` |
| Muted text (≥4.5:1 on cream) | `#4c685b` | `--color-muted` |
| Warm accent (≥4.5:1 w/ cream text) | `#9e5634` | `--color-terra` |
| Warning text (≥4.5:1 on cream) | `#7e5300` | _(inline)_ |

**Color Notes:** Calm forest + cream + morning-sun accent. Verified contrast
(2026-10-12): muted/cream 5.51:1, cream/forest 6.07:1, cream/terra 5.20:1,
earth/sun 9.16:1. Never use the old low-contrast values
(`#5a7a6a`, `#c97d5a`, `#b7730a`, `#8a6500`) for text.

### Typography

- **Heading Font:** Lora (latin) with Sarabun fallback for Thai
- **Body Font:** Sarabun (Thai-first product)
- **Mood:** calm, wellness, health, relaxing, natural, organic
- **Google Fonts:** [Lora + Sarabun](https://fonts.google.com/share?selection.family=Lora:wght@400;500;600;700|Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
```

**Usage:**
```css
--font-display: 'Lora', 'Sarabun', Georgia, serif; /* headings, logo wordmark */
--font-family-sans: 'Sarabun', system-ui, sans-serif; /* body */
.pj-title h1, .pj-auth-title, .pj-auth-brand h2 { font-family: var(--font-display); }
```

**Note:** Lora has no Thai glyphs — Thai headings gracefully fall back to
Sarabun, which is intended (latin "Pakjai" renders serif, Thai stays Sarabun).

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |
| `--shadow-organic` | `0 4px 24px rgb(27 67 50 / 5%)` | Pakjai cards (default) |

---

## Component Specs

### Buttons

```css
/* Pakjai pill button (see .pj-button in src/index.css) */
.pj-button {
  display: inline-flex; align-items: center; justify-content: center;
  gap: .5rem; border-radius: 999px; padding: .65rem 1.1rem;
  font-size: .85rem; font-weight: 500; cursor: pointer;
  transition: background .25s, transform .25s;
}
.pj-button-primary { background: var(--color-forest); color: var(--color-cream-card); }
/* Publish CTA gradient */
.pj-create-publish {
  background: linear-gradient(135deg, #2d6a4f 0%, #40916c 100%);
  box-shadow: 0 4px 16px rgb(45 106 79 / 0.3);
}
```

Global rule (accessibility): `button:not(:disabled) { cursor: pointer; }`.

### Cards

```css
.pj-card {
  padding: 1.75rem; border-radius: 1.5rem; /* organic radius */
  background: var(--color-cream-card);
  box-shadow: var(--shadow-organic);
}
```

Hover lift is allowed only via transform ≤1px / soft shadow — never
layout-shifting scale on the card itself (images may scale inside
`overflow: hidden`).

### Inputs

```css
/* Text inputs: cream fill, leaf border, forest focus ring */
.pj-auth-control input, .pj-create-text, .pj-field input {
  background: var(--color-cream);
  border: 1.5px solid var(--color-leaf);
  border-radius: 1rem;
}
:focus { border-color: var(--color-forest-light); background: #fff;
  box-shadow: 0 0 0 3px rgb(82 183 136 / 0.18); }
/* Global visible keyboard focus */
:focus-visible { outline: 2px solid var(--color-forest-light); outline-offset: 4px; }
```

### Modals

```css
.pj-modal {
  border: none; border-radius: 1.5rem;
  background: var(--color-cream-card); color: var(--color-earth);
  padding: 2rem; width: min(520px, calc(100% - 2rem));
}
.pj-modal::backdrop { background: rgb(27 67 50 / 35%); backdrop-filter: blur(4px); }
```

---

## Style Guidelines

**Style:** Calm Organic *(override of generated "Vibrant & Block-based")*

**Keywords:** calm, soft-green, rounded-organic (1.1–2rem radii), generous
whitespace, gentle motion only, nature imagery, Thai-first typography

**Best For:** Wellness, mindfulness, gentle social spaces

**Key Effects:** Large sections (48px+ gaps), soft shadows, opacity/color
hover shifts (no layout shift), large calm type, 200-300ms ease transitions.
Decorative infinite animation is limited to Quiet-Mode-safe accents
(`animate-leaf-sway`, pulse dot) and is fully disabled under
`prefers-reduced-motion` and `.quiet-mode`.

### Page Pattern

**Pattern Name:** Community/Forum Landing

- **Conversion Strategy:** Show active community (member count, posts today). Highlight benefits. Preview content. Easy onboarding.
- **CTA Placement:** Join button prominent + After member showcase
- **Section Order:** 1. Hero (community value prop), 2. Popular topics/categories, 3. Active members showcase, 4. Join CTA

---

## Anti-Patterns (Do NOT Use)

- ❌ Heavy skeuomorphism
- ❌ Accessibility ignored
- ❌ Vibrant purple / high-energy palette on Pakjai
- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [x] No emojis used as icons (use SVG instead) — verified 2026-10-12 (Lucide only)
- [x] All icons from consistent icon set (Heroicons/Lucide) — verified 2026-10-12
- [x] `cursor-pointer` on all clickable elements — fixed 2026-10-12 (global button rule)
- [x] Hover states with smooth transitions (150-300ms) — verified 2026-10-12
- [x] Light mode: text contrast 4.5:1 minimum — fixed 2026-10-12 (muted/terra/amber darkened, ratios documented above)
- [x] Focus states visible for keyboard navigation — verified 2026-10-12 (`:focus-visible`)
- [x] `prefers-reduced-motion` respected — verified 2026-10-12 (+ `.quiet-mode`)
- [ ] Responsive: 375px, 768px, 1024px, 1440px — CSS breakpoints exist (1023px, 860px, 767px); visual pass still recommended
- [x] No content hidden behind fixed navbars — header is sticky (in-flow), BottomNav has `pb-28` guard on mobile main
- [ ] No horizontal scroll on mobile — pills rows use `overflow-x: auto` intentionally; visual pass still recommended
