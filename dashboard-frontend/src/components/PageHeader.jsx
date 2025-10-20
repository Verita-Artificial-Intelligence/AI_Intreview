import { Button } from '@/components/ui/button'
import { pageHeader } from '@/lib/design-system'

// Updated PageHeader component in pageheader.jsx
const PageHeader = ({ 
  title, 
  subtitle, 
  action,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  variant = 'simple',
  paddingY = 'py-6', // Add custom vertical padding prop
  className = ''
}) => {
  const headerStyles = pageHeader[variant]
  
  if (variant === 'boxed') {
    return (
      <div className={`${headerStyles.wrapper} ${className}`}>
        <div className={`${headerStyles.container.replace('py-6', paddingY)}`}>
          <div className="flex items-center justify-start gap-8">
            <div>
              <h1 className={headerStyles.title}>
                {title}
              </h1>
              {subtitle && (
                <p className={headerStyles.subtitle}>{subtitle}</p>
              )}
            </div>
            {action || (actionLabel && onAction && (
              <Button
                onClick={onAction}
                className="px-6 py-2.5 rounded-xl font-medium"
              >
                {ActionIcon && <ActionIcon className="w-4 h-4 mr-2" />}
                {actionLabel}
              </Button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Simple variant
  return (
    <div className={`${headerStyles.container.replace('py-6', paddingY)} ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={headerStyles.title}>
            {title}
          </h1>
          {subtitle && (
            <p className={headerStyles.subtitle}>{subtitle}</p>
          )}
        </div>
        {action || (actionLabel && onAction && (
          <Button
            onClick={onAction}
            className="px-6 py-2.5 rounded-xl font-medium"
          >
            {ActionIcon && <ActionIcon className="w-4 h-4 mr-2" />}
            {actionLabel}
          </Button>
        ))}
      </div>
    </div>
  )
}
export default PageHeader
