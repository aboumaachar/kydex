"use client"

import { useState } from "react"
import { useKydexAuth } from "../../../../components/kydex/kydex-auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Input } from "../../../../components/ui/input"
import { Button } from "../../../../components/ui/button"

export default function SettingsPage() {
  const { user } = useKydexAuth()
  const [name, setName] = useState(user?.name || "")
  if (!user) return null

  const handleSave = () => alert('Settings saved (demo)')

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input value={name} onChange={(e)=>setName((e.target as HTMLInputElement).value)} className="bg-slate-800 text-white" />
            <Button onClick={handleSave} className="bg-teal-600 text-white">Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
