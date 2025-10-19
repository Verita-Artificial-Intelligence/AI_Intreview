import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Briefcase, Clock, CheckCircle } from 'lucide-react'
import {
  cardStyles,
  iconBackgrounds,
  pageHeader,
  containers,
} from '@/lib/design-system'

const InterviewerDashboard = () => {
  const [stats] = useState([
    {
      icon: <Users className="w-4 h-4" />,
      label: 'Active Candidates',
      value: 0,
      bgClass: iconBackgrounds.purple,
    },
    {
      icon: <Briefcase className="w-4 h-4" />,
      label: 'Scheduled Interviews',
      value: 0,
      bgClass: iconBackgrounds.brand,
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'In Progress',
      value: 0,
      bgClass: iconBackgrounds.yellow,
    },
    {
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Completed Today',
      value: 0,
      bgClass: iconBackgrounds.blue,
    },
  ])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={pageHeader.wrapper}>
        <div className={`${containers.lg} ${pageHeader.container}`}>
          <div>
            <h1 className={pageHeader.title}>Interviewer Portal</h1>
            <p className={pageHeader.subtitle}>
              Manage and review AI-powered interviews
            </p>
          </div>
          <div className="flex gap-3">
            <Button className="rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white">
              New Interview
            </Button>
          </div>
        </div>
      </div>

      <div className={`${containers.lg} mx-auto px-5 py-5`}>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <Card key={index} className={`p-4 ${cardStyles.default}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgClass}`}>
                  <div className="w-4 h-4">{stat.icon}</div>
                </div>
                <div>
                  <p className="text-xs text-neutral-600 font-medium">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold mt-0.5 text-neutral-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mb-6">
          <h2 className="text-lg font-display font-bold mb-3 text-neutral-900">
            Recent Activity
          </h2>
          <Card className={`p-6 text-center ${cardStyles.default}`}>
            <Briefcase className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
            <p className="text-sm text-neutral-600 mb-3">
              No recent activity. Start by creating a new interview!
            </p>
            <Button className="h-8 text-sm rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white">
              Create Interview
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default InterviewerDashboard
