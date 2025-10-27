import { UserProfile } from '@clerk/clerk-react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'

export default function Account() {
  const { user, clerkUser, isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="lg:ml-64 pb-16 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-neutral-900">
              Account Settings
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Manage your profile, security, and preferences
            </p>
          </div>

          {/* Clerk UserProfile Component */}
          <div className="flex justify-center">
            <UserProfile
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'border border-neutral-200 shadow-sm',
                },
              }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
