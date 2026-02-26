import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info'
  className?: string
}

const styles: Record<string, React.CSSProperties> = {
  default: { background: 'var(--purple-muted)', color: 'var(--purple-dark)' },
  success: { background: 'var(--sage-light)',   color: 'var(--sage-dark)' },
  danger:  { background: 'var(--coral-light)',  color: 'var(--coral)' },
  warning: { background: 'var(--yellow-light)', color: 'var(--yellow-dark)' },
  info:    { background: 'var(--teal-light)',   color: 'var(--teal-dark)' },
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('badge', className)} style={styles[variant]}>
      {children}
    </span>
  )
}
