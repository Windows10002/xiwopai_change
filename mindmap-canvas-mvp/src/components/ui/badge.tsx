import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#1e4d8c] text-white',
        secondary: 'border-[#1e3a5f] bg-[#112a4a] text-[#c8d7f0]',
        outline: 'text-[#c8d7f0] border-[#1e3a5f]',
        success: 'border-transparent bg-emerald-900/70 text-emerald-100',
        warning: 'border-transparent bg-amber-900/60 text-amber-100',
        danger: 'border-transparent bg-red-900/70 text-red-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
