import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase } from 'lucide-react'
import { cardStyles } from '@/lib/design-system'

const JobCard = ({ job, onStatusToggle }) => {
  const isOpen = job.status === 'open'

  const handleToggleStatus = () => {
    const newStatus = isOpen ? 'closed' : 'open'
    onStatusToggle(job.id, newStatus)
  }

  return (
    <Card className={`p-4 ${cardStyles.default}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-brand-50 text-brand-500">
          <Briefcase className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm text-neutral-900">
              {job.title}
            </h3>
            <Badge
              variant={isOpen ? 'default' : 'secondary'}
              className={`text-[10px] ${
                isOpen
                  ? 'bg-green-50 text-green-600 border-green-200'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200'
              }`}
            >
              {isOpen ? 'Open' : 'Closed'}
            </Badge>
          </div>
          <p className="text-xs text-neutral-600 mb-2">
            {job.position_type}
            {job.pay_per_hour && (
              <span className="ml-2 text-brand-600 font-semibold">
                ${job.pay_per_hour}/hr
              </span>
            )}
          </p>
          <p className="text-xs text-neutral-700 line-clamp-2 mb-3">
            {job.description}
          </p>
          <p className="text-[10px] text-neutral-500">
            Created {new Date(job.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <Button
        onClick={handleToggleStatus}
        variant="outline"
        className="w-full h-7 text-xs rounded-lg font-medium"
      >
        {isOpen ? 'Close Job' : 'Reopen Job'}
      </Button>
    </Card>
  )
}

export default JobCard
