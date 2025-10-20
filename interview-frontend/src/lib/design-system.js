/**
 * Design System Constants
 *
 * Centralized design tokens and utilities for the Verita AI Interview platform.
 * Updated to match Mercor-style professional indigo palette.
 */

export const colors = {
  // Brand colors - Professional Indigo
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // Primary brand color - Professional Indigo
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  // Accent colors
  accent: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c3d66',
  },
  // Neutral/grayscale
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  // Status colors
  status: {
    info: '#48dbfb',
    success: '#10b981',
    warning: '#feca57',
    error: '#ef4444',
  },
}

/**
 * Gradient definitions using Tailwind classes
 */
export const gradients = {
  primary: 'bg-gradient-to-br from-brand-500 to-brand-600',
  accent: 'bg-gradient-to-br from-accent-400 to-accent-600',
  info: 'bg-gradient-to-br from-blue-400 to-cyan-500',
  success: 'bg-gradient-to-br from-green-400 to-emerald-600',
  purple: 'bg-gradient-to-br from-purple-500 to-indigo-600',
}

/**
 * CSS gradient strings for inline styles (legacy support)
 */
export const cssGradients = {
  primary: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  accent: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
  info: 'linear-gradient(135deg, #48dbfb 0%, #0abde3 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  purple: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
}

/**
 * Shadow utilities using Tailwind classes
 */
export const shadows = {
  subtle: 'shadow-subtle',
  card: 'shadow-card',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
}

/**
 * Status badge styles
 */
export const statusStyles = {
  completed: {
    className: 'bg-green-100 text-green-700 border-2 border-green-200',
    label: 'Completed',
  },
  in_progress: {
    className: 'bg-yellow-100 text-yellow-700 border-2 border-yellow-200',
    label: 'In Progress',
  },
  pending: {
    className: 'bg-neutral-100 text-neutral-700 border-2 border-neutral-300',
    label: 'Pending',
  },
  not_started: {
    className: 'bg-neutral-100 text-neutral-700 border-2 border-neutral-300',
    label: 'Not Started',
  },
  failed: {
    className: 'bg-red-100 text-red-700 border-2 border-red-200',
    label: 'Failed',
  },
}

/**
 * Icon background styles for stat cards - Updated colors
 */
export const iconBackgrounds = {
  brand: 'bg-brand-100 text-brand-600',
  accent: 'bg-accent-100 text-accent-600',
  purple: 'bg-purple-100 text-purple-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
}

/**
 * Common spacing values
 */
export const spacing = {
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
}

/**
 * Typography utilities
 */
export const typography = {
  h1: 'text-3xl font-display font-bold text-neutral-900 tracking-tight',
  h2: 'text-2xl font-display font-bold text-neutral-900 tracking-tight',
  h3: 'text-xl font-display font-semibold text-neutral-900',
  h4: 'text-lg font-display font-semibold text-neutral-800',
  h5: 'text-base font-display font-semibold text-neutral-800',
  body: 'text-sm font-sans text-neutral-700',
  bodyLarge: 'text-base font-sans text-neutral-700',
  bodySmall: 'text-xs font-sans text-neutral-600',
  caption: 'text-xs font-sans text-neutral-500',
  label: 'text-sm font-medium text-neutral-700',
}

/**
 * Button variant class names
 */
export const buttonVariants = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-button hover:shadow-button-hover hover:-translate-y-0.5 transition-all duration-200',
  accent: 'bg-accent-500 hover:bg-accent-600 text-white shadow-button hover:shadow-button-hover hover:-translate-y-0.5 transition-all duration-200',
  secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 transition-all duration-200',
  outline: 'border-2 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 bg-white text-neutral-900 transition-all duration-200',
  ghost: 'hover:bg-neutral-100 text-neutral-700 transition-all duration-200',
  destructive: 'bg-red-600 hover:bg-red-700 text-white shadow-button hover:shadow-button-hover hover:-translate-y-0.5 transition-all duration-200',
}

/**
 * Card styles
 */
export const cardStyles = {
  default: 'bg-white rounded-xl border-2 border-neutral-200 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-250',
  elevated: 'bg-white rounded-xl border-2 border-neutral-200 shadow-lg hover:shadow-xl transition-all duration-250',
  flat: 'bg-white rounded-xl border-2 border-neutral-200',
}

/**
 * Container max widths
 */
export const containers = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
}

/**
 * Page header styles
 */
export const pageHeader = {
  wrapper: 'bg-white border-b border-neutral-200 sticky top-0 z-10 mb-8', // Added mb-8
  container: 'mx-auto px-8 py-8 flex items-center justify-between', // py-6 → py-8
  title: 'text-3xl font-display font-bold text-neutral-900 mb-2',
  subtitle: 'text-base text-neutral-600', // text-sm → text-base
}

/**
 * Utility function to get status badge class names
 */
export const getStatusClass = (status) => {
  const normalizedStatus = status?.toLowerCase().replace(' ', '_')
  return (
    statusStyles[normalizedStatus]?.className || statusStyles.pending.className
  )
}

/**
 * Utility function to get status label
 */
export const getStatusLabel = (status) => {
  const normalizedStatus = status?.toLowerCase().replace(' ', '_')
  return statusStyles[normalizedStatus]?.label || status
}
