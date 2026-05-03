"use client"

import { useState } from "react"
import { useKydexAuth } from "../../../../components/kydex/kydex-auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"

export default function ScreenPage() {
  const { user } = useKydexAuth()
  const [query, setQuery] = useState("")

  if (!user) return null

  const handleScreen = () => {
    alert(`Simulated screening for: ${query}`)
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">New Screening</h2>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Screen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input value={query} onChange={(e)=>setQuery((e.target as HTMLInputElement).value)} placeholder="Name or company" className="w-full bg-slate-800 text-white" />
            <Button onClick={handleScreen} className="bg-teal-600 text-white">Run Screen</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
