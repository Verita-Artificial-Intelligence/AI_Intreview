/**
 * Design System Constants
 *
 * Centralized design tokens and utilities for the Verita AI Interview platform.
 * This file provides a single source of truth for colors, gradients, shadows, and spacing.
 */

export const colors = {
  // Brand colors
  brand: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Primary brand color - light blue
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c3d66',
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
  // Status colors (blue theme)
  status: {
    info: '#3b82f6',
    success: '#0ea5e9',
    warning: '#38bdf8',
    error: '#60a5fa',
  },
}

/**
 * Gradient definitions using Tailwind classes (blue theme)
 */
export const gradients = {
  primary: 'bg-gradient-to-br from-blue-400 to-blue-600',
  accent: 'bg-gradient-to-br from-blue-500 to-blue-700',
  info: 'bg-gradient-to-br from-blue-300 to-blue-500',
  light: 'bg-gradient-to-br from-blue-200 to-blue-400',
  dark: 'bg-gradient-to-br from-blue-600 to-blue-800',
}

/**
 * CSS gradient strings for inline styles (legacy support)
 * Use Tailwind gradient classes above when possible
 */
export const cssGradients = {
  primary: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
  accent: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
  info: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)',
  light: 'linear-gradient(135deg, #bfdbfe 0%, #60a5fa 100%)',
  dark: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
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
 * Status badge styles (blue theme)
 */
export const statusStyles = {
  completed: {
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Completed',
  },
  in_progress: {
    className: 'bg-blue-100 text-blue-600 border-blue-300',
    label: 'In Progress',
  },
  pending: {
    className: 'bg-blue-50 text-blue-500 border-blue-200',
    label: 'Pending',
  },
  failed: {
    className: 'bg-blue-100 text-blue-400 border-blue-200',
    label: 'Failed',
  },
}

/**
 * Icon background styles for stat cards (blue theme)
 */
export const iconBackgrounds = {
  brand: 'bg-brand-50 text-brand-500',
  accent: 'bg-accent-50 text-accent-500',
  primary: 'bg-blue-100 text-blue-600',
  secondary: 'bg-blue-50 text-blue-500',
  light: 'bg-blue-50 text-blue-400',
  dark: 'bg-blue-600 text-blue-50',
}

/**
 * Common spacing values
 */
export const spacing = {
  xs: 'gap-2',
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
  xl: 'gap-12',
}

/**
 * Typography utilities
 */
export const typography = {
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
 * Card styles
 */
export const cardStyles = {
  default:
    'bg-surface rounded-xl border-0 shadow-card hover:shadow-lg transition-shadow duration-300',
  elevated:
    'bg-surface rounded-xl border-0 shadow-lg hover:shadow-xl transition-shadow duration-300',
  flat: 'bg-surface rounded-xl border border-neutral-200',
}

/**
 * Container max widths
 */
export const containers = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-screen-xl',
}

/**
 * Page header styles
 */
export const pageHeader = {
  wrapper: 'bg-surface border-b border-neutral-200 shadow-sm',
  container: 'mx-auto px-6 py-4 flex items-center justify-between',
  title: 'text-2xl font-display font-bold text-neutral-900',
  subtitle: 'text-sm text-neutral-600',
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
