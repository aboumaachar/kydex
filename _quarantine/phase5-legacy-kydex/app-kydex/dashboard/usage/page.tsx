"use client"

import { useKydexAuth } from "../../../../components/kydex/kydex-auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Progress } from "../../../../components/ui/progress"

export default function UsagePage() {
  const { user } = useKydexAuth()
  if (!user) return null

  const pct = user.usage.screensLimit === -1 ? 0 : (user.usage.screensThisMonth / user.usage.screensLimit) * 100

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Usage</h2>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Monthly Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 mb-2">{user.usage.screensThisMonth} / {user.usage.screensLimit === -1 ? '∞' : user.usage.screensLimit}</p>
          <Progress value={pct} />
        </CardContent>
      </Card>
    </div>
  )
}
