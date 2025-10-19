/**
 * Design System Constants
 *
 * Centralized design tokens and utilities for the Verita AI Interview platform.
 * This file provides a single source of truth for colors, gradients, shadows, and spacing.
 */

export const colors = {
  // Brand colors
  brand: {
    50: '#fff7f3',
    100: '#ffe9e0',
    200: '#ffc7b3',
    300: '#ffa380',
    400: '#ff7a4d',
    500: '#e85c24', // Primary brand color
    600: '#cc471b',
    700: '#a93916',
    800: '#862e12',
    900: '#6b240e',
  },
  // Accent colors
  accent: {
    50: '#fffdfa',
    100: '#fff4e6',
    200: '#ffe0b3',
    300: '#ffc47a',
    400: '#ff9c33',
    500: '#f57c00',
    600: '#d36400',
    700: '#a94e00',
    800: '#7a3800',
    900: '#4d2200',
  },
  // Neutral/grayscale
  neutral: {
    50: '#f9f9f9',
    100: '#f1f1f1',
    200: '#e4e4e4',
    300: '#d0d0d0',
    400: '#a3a3a3',
    500: '#757575',
    600: '#525252',
    700: '#3b3b3b',
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
  primary: 'bg-gradient-to-br from-brand-400 to-brand-600',
  accent: 'bg-gradient-to-br from-accent-400 to-accent-600',
  info: 'bg-gradient-to-br from-blue-400 to-cyan-500',
  success: 'bg-gradient-to-br from-green-400 to-emerald-600',
  purple: 'bg-gradient-to-br from-purple-500 to-indigo-600',
}

/**
 * CSS gradient strings for inline styles (legacy support)
 * Use Tailwind gradient classes above when possible
 */
export const cssGradients = {
  primary: 'linear-gradient(135deg, #ff7a4d 0%, #cc471b 100%)',
  accent: 'linear-gradient(135deg, #ff9c33 0%, #d36400 100%)',
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
    className: 'bg-green-50 text-green-600 border-green-200',
    label: 'Completed',
  },
  in_progress: {
    className: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    label: 'In Progress',
  },
  pending: {
    className: 'bg-neutral-100 text-neutral-600 border-neutral-300',
    label: 'Pending',
  },
  failed: {
    className: 'bg-red-50 text-red-600 border-red-200',
    label: 'Failed',
  },
}

/**
 * Icon background styles for stat cards
 */
export const iconBackgrounds = {
  brand: 'bg-brand-50 text-brand-500',
  accent: 'bg-accent-50 text-accent-500',
  purple: 'bg-purple-50 text-purple-500',
  blue: 'bg-blue-50 text-blue-500',
  green: 'bg-green-50 text-green-500',
  yellow: 'bg-yellow-50 text-yellow-500',
}

/**
 * Common spacing values (reduced for better density)
 */
export const spacing = {
  xs: 'gap-1.5',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-5',
  xl: 'gap-8',
}

/**
 * Typography utilities (scaled down ~33% for better density)
 */
export const typography = {
  h1: 'text-2xl font-display font-bold text-neutral-900',
  h2: 'text-xl font-display font-bold text-neutral-900',
  h3: 'text-lg font-display font-semibold text-neutral-900',
  h4: 'text-base font-display font-semibold text-neutral-800',
  h5: 'text-sm font-display font-semibold text-neutral-800',
  body: 'text-sm font-sans text-neutral-700',
  bodyLarge: 'text-base font-sans text-neutral-700',
  bodySmall: 'text-xs font-sans text-neutral-600',
  caption: 'text-[10px] font-sans text-neutral-500',
  label: 'text-xs font-medium text-neutral-700',
}

/**
 * Button variant class names (compatible with existing Button component)
 */
export const buttonVariants = {
  primary: 'bg-brand-500 hover:bg-brand-600 text-white',
  accent: 'bg-accent-500 hover:bg-accent-600 text-white',
  secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900',
  outline:
    'border-2 border-neutral-300 hover:border-neutral-400 bg-white text-neutral-900',
  ghost: 'hover:bg-neutral-100 text-neutral-700',
  destructive: 'bg-red-500 hover:bg-red-600 text-white',
}

/**
 * Card styles (reduced rounded corners for less AI-generated look)
 */
export const cardStyles = {
  default:
    'bg-surface rounded-lg border-0 shadow-card hover:shadow-lg transition-shadow duration-300',
  elevated:
    'bg-surface rounded-lg border-0 shadow-lg hover:shadow-xl transition-shadow duration-300',
  flat: 'bg-surface rounded-lg border border-neutral-200',
}

/**
 * Container max widths (reduced for better content density)
 */
export const containers = {
  sm: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
}

/**
 * Page header styles (scaled down for better density)
 */
export const pageHeader = {
  wrapper: 'bg-surface border-b border-neutral-200 shadow-sm',
  container: 'mx-auto px-5 py-3 flex items-center justify-between',
  title: 'text-xl font-display font-bold text-neutral-900',
  subtitle: 'text-xs text-neutral-600',
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
