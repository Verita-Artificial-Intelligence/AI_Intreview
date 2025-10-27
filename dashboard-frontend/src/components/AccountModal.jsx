import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { UserProfile } from '@clerk/clerk-react'

export default function AccountModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Account Settings
          </DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <UserProfile
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'border-none shadow-none',
              },
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
