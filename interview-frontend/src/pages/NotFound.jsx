import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-neutral-50 via-white to-neutral-100">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-pink-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
          Page Not Found
        </h2>
        <p className="text-neutral-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button className="bg-pink-500 hover:bg-pink-600 text-white">
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default NotFound
