'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function AuthForm () {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn (e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await authClient.signIn.email({ email, password })
      if (error) throw new Error(error.message ?? 'Sign in failed')
      toast.success('Signed in')
      router.push('/admin')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  async function signUp (e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name: name || email.split('@')[0],
      })
      if (error) throw new Error(error.message ?? 'Sign up failed')
      toast.success('Admin request submitted. The super user will review your access.')
      router.push('/admin')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card/60 p-8 backdrop-blur-md">
      <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground">
        Admin access
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Sign in to manage Cursor Kenya content. New admin accounts require super-user approval.
      </p>
      <Tabs defaultValue="signin" className="mt-8">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/80">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin" className="mt-6">
          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border bg-background/60"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary-end text-primary-foreground"
            >
              {loading ? '…' : 'Sign in'}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="signup" className="mt-6">
          <form onSubmit={signUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-border bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email2">Email</Label>
              <Input
                id="email2"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password2">Password</Label>
              <Input
                id="password2"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="border-border bg-background/60"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary-end text-primary-foreground"
            >
              {loading ? '…' : 'Request admin access'}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
