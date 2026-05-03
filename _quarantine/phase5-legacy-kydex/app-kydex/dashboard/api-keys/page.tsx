"use client"

import { useKydexAuth } from "../../../../components/kydex/kydex-auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Button } from "../../../../components/ui/button"

export default function ApiKeysPage() {
  const { user } = useKydexAuth()

  if (!user) return null

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">API Keys</h2>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Manage API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 mb-4">You have {user.apiKeys.length} keys.</p>
          <Button className="bg-teal-600 text-white">Generate New Key</Button>
        </CardContent>
      </Card>
    </div>
  )
}
