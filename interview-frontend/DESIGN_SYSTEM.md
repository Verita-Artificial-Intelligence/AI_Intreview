# Verita AI Interview - Design System

This document outlines the design system for the Verita AI Interview platform. All components and pages should adhere to these standards for consistency and maintainability.

## Table of Contents

- [Color Palette](#color-palette)
- [Typography](#typography)
- [Spacing](#spacing)
- [Components](#components)
- [Usage Guidelines](#usage-guidelines)
- [Migration Guide](#migration-guide)

## Color Palette

### Brand Colors

Our primary brand color palette uses light blue tones:

```js
brand: {
  50:  '#f0f9ff',  // Lightest tint
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9',  // Primary brand color
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c3d66',  // Darkest shade
}
```

**Usage:**
- `brand-500`: Primary buttons, CTAs, important highlights
- `brand-50-100`: Backgrounds for subtle emphasis
- `brand-600-700`: Hover states for buttons

**Tailwind classes:** `bg-brand-500`, `text-brand-600`, `border-brand-300`

### Accent Colors

Complementary accent colors for secondary actions and highlights:

```js
accent: {
  50: '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9',  // Primary accent
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c3d66',
}
```

**Usage:**
- Secondary buttons
- Warning/alert states
- Accent highlights

**Tailwind classes:** `bg-accent-500`, `text-accent-600`

### Neutral Colors

Grayscale palette for text, borders, and backgrounds:

```js
neutral: {
  50:  '#f9f9f9',  // Very light backgrounds
  100: '#f1f1f1',
  200: '#e4e4e4',  // Borders, dividers
  300: '#d0d0d0',
  400: '#a3a3a3',
  500: '#757575',  // Secondary text
  600: '#525252',  // Body text
  700: '#3b3b3b',
  800: '#262626',
  900: '#171717',  // Headings, primary text
}
```

**Usage:**
- `neutral-900`: Headings and primary text
- `neutral-600-700`: Body text
- `neutral-400-500`: Secondary/muted text
- `neutral-200-300`: Borders and dividers
- `neutral-50-100`: Subtle backgrounds

**Tailwind classes:** `text-neutral-900`, `bg-neutral-50`, `border-neutral-200`

### Status Colors

Semantic colors for different states:

```js
status: {
  info: '#48dbfb',     // Blue - informational
  success: '#10b981',  // Green - success/completed
  warning: '#feca57',  // Yellow - warning/in-progress
  error: '#ef4444',    // Red - errors/destructive actions
}
```

**Usage examples:**
- Completed interviews: `bg-green-50 text-green-600`
- In progress: `bg-yellow-50 text-yellow-600`
- Info badges: `bg-blue-50 text-blue-500`

### Surface Colors

```js
background: '#fffaf7'  // Main page background (warm white)
surface: '#ffffff'     // Card and component backgrounds (pure white)
```

**Usage:**
- `bg-background`: Main page/app background
- `bg-surface`: Cards, dialogs, elevated components

## Typography

### Font Families

```js
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],      // Body text
  display: ['Poppins', 'sans-serif'],              // Headings
}
```

**Usage:**
- `font-sans`: All body text, buttons, labels
- `font-display`: All headings (h1-h6)

### Typography Scale

Import from design system: `import { typography } from '@/lib/design-system'`

```js
typography: {
  h1: 'text-4xl font-display font-bold text-neutral-900',
  h2: 'text-3xl font-display font-bold text-neutral-900',
  h3: 'text-2xl font-display font-semibold text-neutral-900',
  h4: 'text-xl font-display font-semibold text-neutral-800',
  h5: 'text-lg font-display font-semibold text-neutral-800',
  body: 'text-base font-sans text-neutral-700',
  bodyLarge: 'text-lg font-sans text-neutral-700',
  bodySmall: 'text-sm font-sans text-neutral-600',
  caption: 'text-xs font-sans text-neutral-500',
  label: 'text-sm font-medium text-neutral-700',
}
```

**Example usage:**
```jsx
<h1 className={typography.h1}>Page Title</h1>
<p className={typography.body}>Body text content</p>
```

## Spacing

Standard spacing scale using Tailwind's default system:

- `gap-2` (0.5rem / 8px): Tight spacing
- `gap-4` (1rem / 16px): Default spacing
- `gap-6` (1.5rem / 24px): Medium spacing
- `gap-8` (2rem / 32px): Large spacing
- `gap-12` (3rem / 48px): Extra large spacing

**Padding/Margin:** Use the same scale (`p-4`, `m-6`, `px-8`, `py-4`, etc.)

## Components

### Cards

Import: `import { cardStyles } from '@/lib/design-system'`

```js
cardStyles: {
  default: 'bg-surface rounded-xl border-0 shadow-card hover:shadow-lg transition-shadow duration-300',
  elevated: 'bg-surface rounded-xl border-0 shadow-lg hover:shadow-xl transition-shadow duration-300',
  flat: 'bg-surface rounded-xl border border-neutral-200',
}
```

**Usage:**
```jsx
<Card className={`p-6 ${cardStyles.default}`}>
  Card content
</Card>
```

### Buttons

Import: `import { buttonVariants } from '@/lib/design-system'`

```js
buttonVariants: {
  primary: 'bg-brand-500 hover:bg-brand-600 text-white',
  accent: 'bg-accent-500 hover:bg-accent-600 text-white',
  secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900',
  outline: 'border-2 border-neutral-300 hover:border-neutral-400 bg-white text-neutral-900',
  ghost: 'hover:bg-neutral-100 text-neutral-700',
  destructive: 'bg-red-500 hover:bg-red-600 text-white',
}
```

**Usage:**
```jsx
<Button className="rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white">
  Primary Action
</Button>
```

### Status Badges

Import: `import { getStatusClass, getStatusLabel } from '@/lib/design-system'`

```js
statusStyles: {
  completed: {
    className: 'bg-green-50 text-green-600 border-green-200',
    label: 'Completed',
  },
  in_progress: {
    className: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    label: 'In Progress',
  },
  // ... more status types
}
```

**Usage:**
```jsx
<span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusClass(status)}`}>
  {getStatusLabel(status)}
</span>
```

### Icon Backgrounds

Import: `import { iconBackgrounds } from '@/lib/design-system'`

```js
iconBackgrounds: {
  brand: 'bg-brand-50 text-brand-500',
  accent: 'bg-accent-50 text-accent-500',
  purple: 'bg-purple-50 text-purple-500',
  blue: 'bg-blue-50 text-blue-500',
  green: 'bg-green-50 text-green-500',
  yellow: 'bg-yellow-50 text-yellow-500',
}
```

**Usage:**
```jsx
<div className={`p-3 rounded-lg ${iconBackgrounds.brand}`}>
  <Icon className="w-6 h-6" />
</div>
```

### Page Headers

Import: `import { pageHeader, containers } from '@/lib/design-system'`

```js
pageHeader: {
  wrapper: 'bg-surface border-b border-neutral-200 shadow-sm',
  container: 'mx-auto px-6 py-4 flex items-center justify-between',
  title: 'text-2xl font-display font-bold text-neutral-900',
  subtitle: 'text-sm text-neutral-600',
}

containers: {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-screen-xl',
}
```

**Usage:**
```jsx
<div className={pageHeader.wrapper}>
  <div className={`${containers.lg} ${pageHeader.container}`}>
    <div>
      <h1 className={pageHeader.title}>Page Title</h1>
      <p className={pageHeader.subtitle}>Subtitle text</p>
    </div>
  </div>
</div>
```

### Gradients

For special cases where inline gradients are needed:

```js
import { cssGradients } from '@/lib/design-system';

// In component
<button style={{ background: cssGradients.primary }}>
  Gradient Button
</button>
```

Available gradients:
- `cssGradients.primary`: Brand orange gradient
- `cssGradients.accent`: Accent orange gradient
- `cssGradients.info`: Blue/cyan gradient
- `cssGradients.success`: Green gradient
- `cssGradients.purple`: Purple/indigo gradient

**Prefer Tailwind gradient classes when possible:**
```jsx
className="bg-gradient-to-br from-brand-400 to-brand-600"
```

## Usage Guidelines

### ✅ DO

- Use design system constants from `/src/lib/design-system.js`
- Use Tailwind utility classes for styling
- Use semantic color names (`neutral-900`, not `#171717`)
- Apply consistent spacing using Tailwind's scale
- Use `bg-background` for page backgrounds and `bg-surface` for cards
- Use `font-display` for headings and `font-sans` for body text
- Import typography, colors, and utilities from the design system

### ❌ DON'T

- Use inline styles with hardcoded colors (`style={{ color: '#2c3e50' }}`)
- Use arbitrary hex colors directly in Tailwind (`text-[#667eea]`)
- Mix gray palette (`text-gray-600`) with neutral palette
- Create custom gradients without adding them to the design system
- Use random spacing values (`gap-5`, `p-7`) - stick to the scale
- Use default Tailwind colors for brand elements

### Migration from Legacy Code

**Before:**
```jsx
<div style={{ background: '#fafafa' }}>
  <h1 style={{ color: '#2c3e50' }}>Title</h1>
  <p className="text-gray-600">Text</p>
  <button style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
    Click me
  </button>
</div>
```

**After:**
```jsx
<div className="bg-background">
  <h1 className="text-2xl font-display font-bold text-neutral-900">Title</h1>
  <p className="text-neutral-600">Text</p>
  <button className="bg-brand-500 hover:bg-brand-600 text-white">
    Click me
  </button>
</div>
```

## File Structure

```
frontend/src/
├── lib/
│   └── design-system.js          # Design system constants and utilities
├── index.css                      # CSS variables and base styles
└── tailwind.config.js             # Tailwind configuration with theme
```

## Additional Resources

- **Tailwind Documentation:** https://tailwindcss.com/docs
- **Design System File:** `/frontend/src/lib/design-system.js`
- **Config File:** `/frontend/tailwind.config.js`

## Changelog

### v1.0.0 (Current)
- Initial design system implementation
- Migrated from random inline styles to systematic approach
- Established brand colors (orange palette)
- Created reusable component styles
- Standardized spacing and typography
- Removed legacy gray colors in favor of neutral palette
