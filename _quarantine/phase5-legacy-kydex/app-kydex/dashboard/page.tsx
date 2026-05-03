"use client"

import Link from "next/link"
import { useKydexAuth } from "../../../components/kydex/kydex-auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Badge } from "../../../components/ui/badge"
import { Progress } from "../../../components/ui/progress"

export default function KydexDashboardPage() {
  const { user } = useKydexAuth()

  if (!user) return null

  const usagePercentage = user.usage.screensLimit === -1 ? 0 : (user.usage.screensThisMonth / user.usage.screensLimit) * 100

  const recentScreenings = [
    { name: "Ahmad Al-Hassan", result: "clear", time: "2 min ago" },
    { name: "Global Trade Ltd", result: "clear", time: "15 min ago" },
    { name: "Mohamed Ibrahim", result: "potential", time: "1 hour ago" },
    { name: "Beirut Enterprises", result: "clear", time: "3 hours ago" },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-slate-400 mt-1">Here's what's happening with your KYDEX account</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Screenings This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{user.usage.screensThisMonth.toLocaleString()}</div>
            {user.usage.screensLimit !== -1 && (
              <div className="mt-2">
                <Progress value={usagePercentage} className="h-1 bg-slate-800" />
                <p className="text-xs text-slate-500 mt-1">{user.usage.screensLimit - user.usage.screensThisMonth} remaining</p>
              </div>
            )}
            {user.usage.screensLimit === -1 && <p className="text-xs text-teal-400 mt-1">Unlimited</p>}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{user.apiKeys.filter(k=>k.isActive).length}</div>
            <p className="text-xs text-slate-500 mt-1">{user.apiKeys.length} total keys created</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Clear Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">98.2%</div>
            <p className="text-xs text-green-400 mt-1">+2.1% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">124ms</div>
            <p className="text-xs text-slate-500 mt-1">99.9% uptime this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-slate-400">Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/kydex/dashboard/screen"><Button className="w-full justify-start gap-3 bg-teal-600 hover:bg-teal-700 text-white">New Screening</Button></Link>
            <Link href="/kydex/dashboard/usage"><Button variant="outline" className="w-full justify-start gap-3 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">View Usage Analytics</Button></Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Screenings</CardTitle>
            <CardDescription className="text-slate-400">Your latest screening results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentScreenings.map((screening, index)=> (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={screening.result === "clear" ? "text-green-400" : "text-amber-400"}>{screening.result === "clear" ? "✔" : "!"}</div>
                    <div>
                      <p className="text-sm font-medium text-white">{screening.name}</p>
                      <p className="text-xs text-slate-500">{screening.time}</p>
                    </div>
                  </div>
                  <Badge className={screening.result === "clear" ? "bg-green-600/20 text-green-400" : "bg-amber-600/20 text-amber-400"}>{screening.result === "clear" ? "Clear" : "Review"}</Badge>
                </div>
              ))}
            </div>
            <Link href="/kydex/dashboard/screen"><Button variant="ghost" className="w-full mt-4 text-teal-400 hover:text-teal-300 hover:bg-slate-800">View all screenings</Button></Link>
          </CardContent>
        </Card>
      </div>

      {user.tier === "free" && (
        <Card className="bg-gradient-to-r from-teal-900/50 to-slate-900 border-teal-800/50">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Upgrade to Pro</h3>
              <p className="text-slate-400 mt-1">Get API access, 500 monthly screenings, and 30-day audit logs</p>
            </div>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">Upgrade Now</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
