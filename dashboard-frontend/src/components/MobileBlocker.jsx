import { useEffect, useState } from 'react'

const MobileBlocker = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkViewportSize = () => {
      // Consider anything below 768px as mobile/small device
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
    }

    // Check on mount
    checkViewportSize()

    // Check on resize
    window.addEventListener('resize', checkViewportSize)

    return () => window.removeEventListener('resize', checkViewportSize)
  }, [])

  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="max-w-md text-center">
          <div className="flex justify-center mb-6">
            <img
              src="/images/verita_ai_logo.jpeg"
              alt="Verita"
              className="w-20 h-20 rounded-lg object-cover"
            />
          </div>

          <h1 className="text-2xl font-display font-bold mb-4 text-neutral-900">
            Verita Admin
          </h1>

          <h2 className="text-xl font-semibold mb-3 text-neutral-900">
            Desktop Required
          </h2>

          <p className="text-neutral-600 leading-relaxed mb-4">
            Please access Verita from a desktop or laptop computer for the best
            experience.
          </p>

          <p className="text-sm text-neutral-600">
            Looking for our jobs site? Visit{' '}
            <a
              href="https://interview.verita-ai.com"
              className="text-brand-500 hover:text-brand-600 font-medium"
            >
              interview.verita-ai.com
            </a>
          </p>
        </div>
      </div>
    )
  }

  return children
}

export default MobileBlocker
