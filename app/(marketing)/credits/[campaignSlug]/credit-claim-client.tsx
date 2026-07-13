'use client'

import { useState } from 'react'
import { Check, Copy, Gift, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Provider = { name: string; slug: string; active: boolean; instructions: string | null }
type Step = 'email' | 'code' | 'success'

export function CreditClaimClient ({ campaignSlug, campaignStatus, claimStartsAt, claimEndsAt, providers }: {
  campaignSlug: string; campaignStatus: string; claimStartsAt: string | null; claimEndsAt: string | null; providers: Provider[]
}) {
  const [providerSlug, setProviderSlug] = useState(providers.find((p) => p.active)?.slug ?? providers[0]?.slug ?? '')
  const [email, setEmail] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [message, setMessage] = useState('')
  const [credit, setCredit] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const now = Date.now()
  const windowOpen = campaignStatus === 'active' && (!claimStartsAt || new Date(claimStartsAt).getTime() <= now) && (!claimEndsAt || new Date(claimEndsAt).getTime() >= now)

  async function requestCode (event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/credits/verify/request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campaignSlug, email }) })
      const data = await response.json()
      setMessage(data.message)
      if (data.verificationId) { setVerificationId(data.verificationId); setStep('code') }
    } finally { setBusy(false) }
  }

  async function submitCode (event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/credits/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ verificationId, code: form.get('code'), campaignSlug, providerSlug }) })
      const data = await response.json()
      setMessage(data.message)
      if (data.ok && data.credit) { setCredit(data.credit); setStep('success') }
    } finally { setBusy(false) }
  }

  async function copyCredit () {
    await navigator.clipboard.writeText(credit); setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  return <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
    <Card className="relative overflow-hidden border-border/70 bg-card/80 shadow-[0_28px_100px_rgb(0_0_0/0.28)] backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <CardHeader className="pb-2"><span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Gift /></span><CardTitle className="text-2xl">{step === 'success' ? 'Your credit is ready' : 'Claim your credit'}</CardTitle><CardDescription>{step === 'email' ? 'We will send a short-lived code to the RSVP email you enter.' : step === 'code' ? `Enter the six-digit code sent to ${email}.` : 'Keep this value private. It is shown because your email was verified.'}</CardDescription></CardHeader>
      <CardContent className="pt-4">
        {!windowOpen ? <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-200">This campaign is not currently accepting new claims.</div> : step === 'email' ? <form onSubmit={requestCode} className="space-y-5"><div className="space-y-2"><Label htmlFor="provider">Provider</Label><div className="grid gap-2 sm:grid-cols-2">{providers.map((provider) => <button key={provider.slug} type="button" disabled={!provider.active} onClick={() => setProviderSlug(provider.slug)} className={`rounded-xl border p-4 text-left transition-colors ${providerSlug === provider.slug ? 'border-primary bg-primary/8' : 'border-border bg-background/40 hover:border-primary/40'} disabled:opacity-45`}><span className="font-medium">{provider.name}</span><span className="mt-1 block text-xs text-muted-foreground">{provider.instructions || 'Credit allocation'}</span></button>)}</div></div><div className="space-y-2"><Label htmlFor="email">RSVP email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10" required autoComplete="email" /></div></div><Button className="w-full" disabled={busy || !providerSlug}>{busy ? <Loader2 className="animate-spin" /> : <KeyRound />} Send verification code</Button></form> : step === 'code' ? <form onSubmit={submitCode} className="space-y-5"><div className="space-y-2"><Label htmlFor="code">Verification code</Label><Input id="code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="h-14 text-center font-mono text-2xl tracking-[0.35em]" autoFocus required /></div><Button className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Verify and claim</Button><Button type="button" variant="ghost" className="w-full" onClick={() => setStep('email')}>Use another email</Button></form> : <div className="space-y-5"><div className="rounded-xl border border-primary/25 bg-primary/5 p-5"><p className="text-xs uppercase tracking-[0.2em] text-primary">Redeemable value</p><p className="mt-3 break-all font-mono text-base text-foreground">{credit}</p></div><Button className="w-full" onClick={copyCredit}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy credit'}</Button></div>}
        {message ? <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
    <aside className="space-y-4"><Card className="border-border/70 bg-card/55"><CardHeader><CardTitle className="text-base">Private by design</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-muted-foreground"><p className="flex gap-3"><Mail className="mt-0.5 size-4 shrink-0 text-primary" />Eligibility is not revealed before email verification.</p><p className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />A retry returns the same credit instead of consuming another.</p><p className="flex gap-3"><Gift className="mt-0.5 size-4 shrink-0 text-primary" />Claiming does not mark you as checked in on Luma or as redeemed.</p></CardContent></Card></aside>
  </div>
}
