import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: cn(
          'relative border-none text-white',
          'bg-brand-600 hover:bg-brand-700',

          // Radial gradient overlay
          'after:absolute after:inset-[1px] after:rounded-[calc(theme(borderRadius.lg)-1px)] after:pointer-events-none',
          'after:bg-[radial-gradient(100%_100%_at_50%_0%,_theme(colors.white/16%)_0%,_theme(colors.white/0%)_100%)]',

          // Inner border
          'before:absolute before:inset-0 before:rounded-lg before:transition before:pointer-events-none',
          'before:shadow-[inset_0_0_0_1px_theme(colors.brand.600/100%)]',
          'hover:before:shadow-[inset_0_0_0_1px_theme(colors.brand.700/100%)]',

          // Depth shadows
          'shadow-[shadow:theme(boxShadow.xs),_inset_0_1px_0.5px_0.5px_theme(colors.white/44%),_inset_0_-1px_2px_theme(colors.brand.800/50%)]',

          // Make content appear above pseudo-elements
          '[&>*]:relative [&>*]:z-10',

          // Disabled state
          'disabled:bg-brand-100',
          'disabled:shadow-[shadow:theme(boxShadow.xs),_inset_0_1px_0.5px_0.5px_theme(colors.brand.50/55%)]',
          'disabled:before:shadow-[inset_0_0_0_1px_theme(colors.brand.200/100%)]',

          // Focus state
          'focus-visible:ring-2 focus-visible:ring-brand-600/24 focus-visible:ring-offset-2'
        ),
        destructive: cn(
          'relative border-none text-white',
          'bg-error-600 hover:bg-error-700',

          // Radial gradient overlay
          'after:absolute after:inset-[1px] after:rounded-[calc(theme(borderRadius.lg)-1px)] after:pointer-events-none',
          'after:bg-[radial-gradient(100%_100%_at_50%_0%,_theme(colors.white/16%)_0%,_theme(colors.white/0%)_100%)]',

          // Inner border
          'before:absolute before:inset-0 before:rounded-lg before:transition before:pointer-events-none',
          'before:shadow-[inset_0_0_0_1px_theme(colors.error.600/100%)]',
          'hover:before:shadow-[inset_0_0_0_1px_theme(colors.error.700/100%)]',

          // Depth shadows
          'shadow-[shadow:theme(boxShadow.xs),_inset_0_1px_0.5px_0.5px_theme(colors.white/44%),_inset_0_-1px_2px_theme(colors.error.800/24%)]',

          // Make content appear above pseudo-elements
          '[&>*]:relative [&>*]:z-10',

          // Disabled state
          'disabled:bg-error-100',
          'disabled:shadow-[shadow:theme(boxShadow.xs),_inset_0_1px_0.5px_0.5px_theme(colors.error.50/55%)]',
          'disabled:before:shadow-[inset_0_0_0_1px_theme(colors.error.200/100%)]',

          // Focus state
          'focus-visible:ring-2 focus-visible:ring-error-600/24 focus-visible:ring-offset-2'
        ),
        outline:
          'border border-input shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: cn(
          'relative border-none text-neutral-900',
          'bg-white hover:bg-neutral-50',

          // Depth shadows with inner border
          'shadow-[shadow:theme(boxShadow.xs),_inset_0_0_0_1px_theme(colors.neutral.200/100%),_inset_0_-1px_2px_theme(colors.neutral.900/12%)]',

          // Make content appear above shadows
          '[&>*]:relative [&>*]:z-10',

          // Disabled state
          'disabled:text-neutral-300',

          // Focus state
          'focus-visible:ring-2 focus-visible:ring-neutral-900/10 focus-visible:ring-offset-2'
        ),
        ghost:
          'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:text-neutral-400',
        link: 'text-primary underline-offset-4 hover:underline',
        'link-arrow':
          'text-neutral-700 hover:text-brand-600 underline-offset-4 decoration-transparent hover:decoration-brand-600 decoration-2 underline transition-all duration-200',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
