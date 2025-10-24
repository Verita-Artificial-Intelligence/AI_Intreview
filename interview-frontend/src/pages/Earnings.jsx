import { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  Download,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

export default function Earnings() {
  const { user, token } = useAuth()
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEarnings()
  }, [])

  const fetchEarnings = async () => {
    try {
      setLoading(true)
      // Fetch real earnings data from backend
      const [summaryRes, transactionsRes] = await Promise.all([
        axios.get(`${API}/earnings/user/${user?.id}/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/earnings/user/${user?.id}/transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const summary = summaryRes.data
      const transactions = transactionsRes.data

      // Transform transactions for display
      const formattedTransactions = transactions.map((transaction) => ({
        id: transaction.id,
        type: 'earning',
        amount: transaction.amount,
        description: `${transaction.task_name} - ${transaction.job_title}`,
        date: transaction.created_at,
        status: transaction.status === 'paid' ? 'completed' : 'pending',
      }))

      const earningsData = {
        totalEarnings: summary.total_earnings || 0,
        pendingPayout: summary.pending_payout || 0,
        availableBalance: summary.available_balance || 0,
        nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transactions: formattedTransactions,
        bankAccount: {
          accountHolder: user?.name || 'User',
          bankName: 'Bank of Example',
          accountNumber: '****1234',
          routingNumber: '****5678',
        },
      }
      setEarnings(earningsData)
    } catch (error) {
      console.error('Error fetching earnings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-neutral-600">Loading earnings...</p>
        </main>
      </div>
    )
  }

  if (!earnings) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-neutral-600">Failed to load earnings</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-neutral-900 mb-2 tracking-tight leading-tight">
              Your Earnings
            </h1>
            <p className="text-lg text-neutral-600 font-light">
              Track income from completed work and manage payments
            </p>
          </div>

          {/* Earnings Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Total Earnings */}
            <Card className="p-8 bg-white border border-neutral-200 hover:border-neutral-300 transition-colors">
              <p className="text-sm font-medium text-neutral-600 tracking-wide uppercase mb-3">
                Total Earnings
              </p>
              <div className="flex items-baseline gap-2 mb-6">
                <p className="text-5xl font-bold text-neutral-900 tracking-tight">
                  ${earnings.totalEarnings.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-neutral-600">
                All-time earnings from completed annotations
              </p>
            </Card>

            {/* Available Balance */}
            <Card className="p-8 bg-gradient-to-br from-brand-500 to-brand-600 text-white border-0">
              <p className="text-sm font-medium text-brand-100 tracking-wide uppercase mb-3">
                Available Balance
              </p>
              <div className="flex items-baseline gap-2 mb-6">
                <p className="text-5xl font-bold tracking-tight">
                  ${earnings.availableBalance.toFixed(2)}
                </p>
              </div>
              <Button size="sm" className="mt-4 w-full bg-white text-brand-600 hover:bg-brand-50 font-medium">
                Request Payout
              </Button>
            </Card>

            {/* Pending */}
            <Card className="p-8 bg-white border border-neutral-200 hover:border-neutral-300 transition-colors">
              <p className="text-sm font-medium text-neutral-600 tracking-wide uppercase mb-3">
                Pending Payment
              </p>
              <div className="flex items-baseline gap-2 mb-6">
                <p className="text-5xl font-bold text-neutral-900 tracking-tight">
                  ${earnings.pendingPayout.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-neutral-600">
                Available on {new Date(earnings.nextPayoutDate).toLocaleDateString()}
              </p>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="transactions" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="settings">Payment Settings</TabsTrigger>
            </TabsList>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                  Transaction History
                </h3>

                <div className="space-y-3">
                  {earnings.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${
                          transaction.type === 'earning'
                            ? 'bg-green-100'
                            : 'bg-red-100'
                        }`}>
                          {transaction.type === 'earning' ? (
                            <TrendingUp className={`w-5 h-5 ${
                              transaction.type === 'earning'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`} />
                          ) : (
                            <DollarSign className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 truncate">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-neutral-600">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`font-semibold ${
                            transaction.type === 'earning'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {transaction.type === 'earning' ? '+' : ''} ${Math.abs(transaction.amount).toFixed(2)}
                          </p>
                          <Badge className={`mt-1 ${
                            transaction.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transaction.status === 'completed' ? 'Completed' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Statement
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Payment Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-6">
                {/* Bank Account Information */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                    Bank Account Information
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Account Holder
                      </label>
                      <div className="px-4 py-2 bg-neutral-50 rounded-lg text-neutral-900">
                        {earnings.bankAccount.accountHolder}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Bank Name
                      </label>
                      <div className="px-4 py-2 bg-neutral-50 rounded-lg text-neutral-900">
                        {earnings.bankAccount.bankName}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Account Number
                        </label>
                        <div className="px-4 py-2 bg-neutral-50 rounded-lg text-neutral-900 font-mono">
                          {earnings.bankAccount.accountNumber}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Routing Number
                        </label>
                        <div className="px-4 py-2 bg-neutral-50 rounded-lg text-neutral-900 font-mono">
                          {earnings.bankAccount.routingNumber}
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" className="mt-4">
                      Update Bank Account
                    </Button>
                  </div>
                </Card>

                {/* Payout Schedule */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                    Payout Schedule
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-lg border border-brand-200">
                      <Calendar className="w-5 h-5 text-brand-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-brand-700">Bi-weekly Payouts</p>
                        <p className="text-sm text-brand-600">
                          You receive payouts every 2 weeks on Mondays
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
