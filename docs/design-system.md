# Verita Interview Platform – Design System

This document is the single source of truth for the visual language shared by both
React applications in this repository (`dashboard-frontend` and `interview-frontend`).
It consolidates the duplicated documentation that previously lived in each frontend
so the design tokens, usage patterns, and implementation notes stay consistent.

Use this guide when building new UI or updating existing screens. The code-level
tokens referenced below live in:

- `dashboard-frontend/src/lib/design-system.js`
- `interview-frontend/src/lib/design-system.js`
- Tailwind theme overrides in each app's `tailwind.config.js`

---

## Palette

### Brand

Vibrant purple palette used for primary actions and navigation highlights.

```ts
brand: {
  50:  '#f5f3ff',
  100: '#ede9fe',
  200: '#ddd6fe',
  300: '#c4b5fd',
  400: '#a78bfa',
  500: '#8b5cf6', // primary CTA
  600: '#7c3aed',
  700: '#6d28d9',
  800: '#5b21b6',
  900: '#4c1d95',
}
```

Guidelines:
- `brand-500` is the default button background.
- Hover states step up to `brand-600`.
- Use `brand-50/100` for backgrounds that need subtle emphasis.

### Accent

Accent mirrors the brand palette and supports secondary emphasis (filters, tags,
neutral CTAs).

```ts
accent: {
  50: '#f5f3ff',
  100: '#ede9fe',
  200: '#ddd6fe',
  300: '#c4b5fd',
  400: '#a78bfa',
  500: '#8b5cf6',
  600: '#7c3aed',
  700: '#6d28d9',
  800: '#5b21b6',
  900: '#4c1d95',
}
```

### Neutral

Gray scale for typography, borders, body backgrounds.

```ts
neutral: {
  50:  '#f9f9f9',
  100: '#f1f1f1',
  200: '#e4e4e4',
  300: '#d0d0d0',
  400: '#a3a3a3',
  500: '#757575',
  600: '#525252', // body text
  700: '#3b3b3b',
  800: '#262626',
  900: '#171717', // headings
}
```

### Status

Semantic colors for badges, charts, and notifications.

```ts
status: {
  info: '#48dbfb',
  success: '#10b981',
  warning: '#feca57',
  error: '#ef4444',
}
```

Usage:
- Completed tasks/interviews → `bg-green-50 text-green-600`
- Warnings/in-progress states → `bg-yellow-50 text-yellow-600`
- Errors → `bg-red-50 text-red-600`

### Surfaces

```ts
background: '#fffaf7' // app shell
surface: '#ffffff'    // cards + modals
```

Set page wrappers to `bg-background` and cards/dialogs to `bg-surface`.

---

## Typography

- **Display**: `font-display` (Poppins) for headings.
- **Body**: `font-sans` (Inter) for paragraphs, lists, helper text.

Common helpers exported from `design-system.js`:

```ts
typography = {
  h1: 'text-4xl font-display font-bold text-neutral-900',
  h2: 'text-3xl font-display font-bold text-neutral-900',
  h3: 'text-2xl font-display font-semibold text-neutral-900',
  h4: 'text-xl font-display font-semibold text-neutral-800',
  body: 'text-base font-sans text-neutral-700',
  bodySmall: 'text-sm font-sans text-neutral-600',
  caption: 'text-xs font-sans text-neutral-500',
}
```

Rules of thumb:
- Keep headings concise; avoid mixing default Tailwind grays with the neutral scale.
- Use `font-medium` only for labels or button text; reserve `font-display` for titles.

---

## Spacing & Layout

- Base spacing scale: multiples of 4 via Tailwind (`gap-4`, `px-6`, etc).
- Exported helpers (`spacing.md`, `spacing.lg`) provide semantic gap classes for card
  layouts and grid spacing.
- Containers: import `{ containers }` from the design system (`sm`, `md`, `lg`, `xl`)
  to keep consistent max-widths across dashboard pages.

---

## Components & Utilities

### Buttons

`buttonVariants` exposes the canonical Tailwind class names used by the shared button
component in each app.

```ts
buttonVariants = {
  primary: 'bg-brand-500 hover:bg-brand-600 text-white',
  accent: 'bg-accent-500 hover:bg-accent-600 text-white',
  secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900',
  outline: 'border-2 border-neutral-300 hover:border-neutral-400 bg-white text-neutral-900',
}
```

### Cards & Shadows

- Card shells use `cardStyles.default` (rounded `xl`, soft borders, subtle shadow).
- Shadow tokens (`shadows.subtle`, `shadows.card`, `shadows.lg`) are Tailwind utility
  aliases defined in `tailwind.config.js`.

### Status Badges

```ts
statusStyles = {
  completed: { className: 'bg-green-50 text-green-600 border-green-200' },
  in_progress: { className: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  pending: { className: 'bg-neutral-100 text-neutral-600 border-neutral-300' },
  failed: { className: 'bg-red-50 text-red-600 border-red-200' },
}
```

Use these helpers with `Badge` components to keep semantic colors consistent between
the interviewer dashboard and the candidate experience.

### Icon Backgrounds

`iconBackgrounds` provides paired background/foreground classes for icon chips in
summary cards (`brand`, `accent`, `purple`, `blue`, `green`, `yellow`).

---

## Usage Guidelines

- ✅ Import tokens from the design-system module instead of hard-coding colors,
  spacing, or typography.
- ✅ Stick to Tailwind's spacing scale (`gap-2`, `gap-4`, `p-6`).
- ✅ Prefer gradient helpers (`gradients.primary`) when a gradient background is
  required; `cssGradients.*` exists for legacy inline styles only.
- ❌ Avoid inline hex values (`style={{ color: '#2c3e50' }}`) or arbitrary Tailwind
  colors (`text-[#667eea]`).
- ❌ Do not mix default `gray-*` classes with the custom neutral palette.
- ❌ Resist ad-hoc box-shadows or blur effects—extend the theme in Tailwind first.

---

## Implementation Checklist

When creating a new UI surface:

1. Import tokens from `@/lib/design-system` (both apps alias `src` to `@`).
2. Wrap pages in the `pageHeader.wrapper` and `containers.*` helpers to inherit the
   consistent header treatment used across the dashboard.
3. For realtime interview UI states, reuse status tokens (`statusStyles`) for metrics
   and top-level banners so candidate and interviewer views stay in sync.
4. If you need a new color, spacing, or typography variant, update both
   `design-system.js` files and this document in one commit to keep documentation and
   implementation aligned.

---

## Changelog

- **2024-12-XX** – Consolidated duplicate frontend design docs into this central
  reference; clarified shared token locations and usage conventions.
- **2024-09-18** – Introduced the light-blue brand palette and Tailwind theme overrides
  (archived in git history).
