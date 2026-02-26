import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export const DialogClose = RadixDialog.Close

interface DialogContentProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function DialogContent({ title, children, className }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(45,37,53,0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 40,
          animation: 'fadeIn 0.2s ease',
        }}
      />
      <RadixDialog.Content
        className={cn(className)}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          background: 'white',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          padding: '1.75rem',
          width: '100%',
          maxWidth: 480,
          maxHeight: '92dvh',
          overflowY: 'auto',
          animation: 'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}>
          <RadixDialog.Title style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--purple-deep)',
          }}>
            {title}
          </RadixDialog.Title>
          <RadixDialog.Close
            className="btn btn-ghost btn-icon"
            style={{ color: 'var(--purple-light)' }}
            aria-label="Fechar"
          >
            <X size={18} />
          </RadixDialog.Close>
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}
