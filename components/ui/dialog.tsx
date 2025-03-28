import * as React from "react"
import { X } from "lucide-react"

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${open ? 'visible' : 'invisible'}`}>
      <div className={`fixed inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      {children}
    </div>
  )
}

type DialogContentProps = {
  className?: string
  children: React.ReactNode
}

export function DialogContent({ className, children }: DialogContentProps) {
  return (
    <div className={`bg-white rounded-lg shadow-xl overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

type DialogHeaderProps = {
  children: React.ReactNode
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return (
    <div className="border-b px-6 py-4 flex items-center justify-between">
      {children}
    </div>
  )
}