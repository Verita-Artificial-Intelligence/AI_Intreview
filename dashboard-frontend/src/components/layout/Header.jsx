import { Button } from '@/components/ui/button'

const Header = ({ title, subtitle, action }) => {
  return (
    <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-900 mb-1">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-neutral-600">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      </div>
    </div>
  )
}

export default Header
