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

export default function KydexSignupPage() {
  const router = useRouter()
  const { signup } = useKydexAuth()
  const [formData, setFormData] = useState({ name: "", email: "", company: "", password: "", confirmPassword: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    const result = await signup({ email: formData.email, password: formData.password, name: formData.name, company: formData.company })
    if (result.success) {
      router.push("/kydex/dashboard")
    } else {
      setError(result.error || "Signup failed")
    }

    setIsLoading(false)
  }

  const freeTierFeatures = ["50 screenings per month", "OFAC & UN sanctions lists", "Basic search results", "7-day audit logs"]

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/kydex" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600">
              <span className="text-white">K</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white">KYDEX</span>
              <span className="text-xs text-slate-400">Compliance Intelligence</span>
            </div>
          </Link>
          <Link href="/kydex">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800 gap-2">Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Create Account</CardTitle>
              <CardDescription className="text-slate-400">Start screening with KYDEX today</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert className="bg-red-900/20 border-red-800 text-red-400"><AlertDescription>{error}</AlertDescription></Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Full Name</Label>
                  <Input id="name" type="text" placeholder="John Doe" value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Work Email</Label>
                  <Input id="email" type="email" placeholder="you@company.com" value={formData.email} onChange={(e)=>setFormData({...formData,email:e.target.value})} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">Password</Label>
                  <Input id="password" type={showPassword?"text":"password"} placeholder="Min. 6 characters" value={formData.password} onChange={(e)=>setFormData({...formData,password:e.target.value})} required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500" />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                  {isLoading ? <><Spinner className="mr-2 h-4 w-4" />Creating account...</> : "Create Free Account"}
                </Button>

                <div className="text-center text-sm text-slate-400">Already have an account? <Link href="/kydex/login" className="text-teal-400 hover:text-teal-300">Sign in</Link></div>
              </form>
            </CardContent>
          </Card>

          <div className="flex flex-col justify-center">
            <div className="bg-gradient-to-br from-teal-900/30 to-slate-900 rounded-xl border border-teal-800/50 p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-teal-600/20 text-teal-400 text-sm font-medium">Free Tier</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Start for Free</h3>
              <p className="text-slate-400 mb-6">Get started with KYDEX at no cost. Upgrade anytime for more screenings and API access.</p>
              <ul className="space-y-3">
                {freeTierFeatures.map((feature, index)=>(<li key={index} className="flex items-center gap-3 text-slate-300"><div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600/20">✓</div>{feature}</li>))}
              </ul>
              <div className="mt-8 pt-6 border-t border-slate-700">
                <p className="text-sm text-slate-400">Need API access or higher limits? <Link href="/kydex#pricing" className="text-teal-400 hover:text-teal-300">View Pro & Enterprise plans</Link></p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6">
        <p className="text-center text-slate-500 text-sm">© {new Date().getFullYear()} KYDEX Compliance Intelligence</p>
      </footer>
    </div>
  )
}
