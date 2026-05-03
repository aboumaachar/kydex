"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Alert, AlertDescription } from "../../../components/ui/alert"
import { Spinner } from "../../../components/ui/spinner"
import { useKydexAuth } from "../../../components/kydex/kydex-auth-provider"

export default function KydexLoginPage() {
  const router = useRouter()
  const { login } = useKydexAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    const result = await login({ email, password })
    if (result.success) {
      router.push("/kydex/dashboard")
    } else {
      setError(result.error || "Login failed")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Sign in to KYDEX</CardTitle>
            <CardDescription className="text-slate-400">Use your account to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (<Alert className="bg-red-900/20 border-red-800 text-red-400"><AlertDescription>{error}</AlertDescription></Alert>)}
              <div>
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e)=>setEmail(e.target.value)} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500" />
              </div>
              <div>
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input id="password" type="password" placeholder="Your password" value={password} onChange={(e)=>setPassword(e.target.value)} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500" />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                {isLoading ? <><Spinner className="mr-2 h-4 w-4" />Signing in...</> : "Sign in"}
              </Button>
              <div className="text-center text-sm text-slate-400">New here? <Link href="/kydex/signup" className="text-teal-400 hover:text-teal-300">Create account</Link></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
