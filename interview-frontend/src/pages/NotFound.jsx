import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const NotFound = () => {
  return (
    <div className="flex min-h-screen bg-white items-center justify-center">
      <Card className="w-full max-w-2xl mx-4 p-12 border border-neutral-200">
        <div className="text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/images/verita_ai_logo.jpeg"
              alt="Verita AI"
              className="w-16 h-16 rounded-lg object-cover"
            />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-neutral-900 mb-2">
            Page Not Found
          </h2>

          {/* Description */}
          <p className="text-base text-neutral-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Action Button */}
          <Link to="/">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold">
              Return Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default NotFound
