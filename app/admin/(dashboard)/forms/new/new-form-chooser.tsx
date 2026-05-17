'use client'

import { useState } from 'react'
import { ArrowLeft, FileText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormEditor } from '@/app/admin/(dashboard)/forms/form-editor'

type Mode = 'chooser' | 'blank' | 'ai'

export function NewFormChooser ({ aiEnabled }: { aiEnabled: boolean }) {
  const [mode, setMode] = useState<Mode>('chooser')

  if (mode === 'chooser') {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Pick how you&apos;d like to start. You can always tweak everything in the editor before publishing.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode('blank')}
            className="group rounded-2xl text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Card className="h-full border-border bg-card/50 transition group-hover:border-primary/40">
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <FileText className="size-5 text-muted-foreground" />
                </div>
                <CardTitle className="mt-3 text-base">Start blank</CardTitle>
                <CardDescription>
                  Build the form yourself, field by field.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary group-hover:underline">
                  Open empty editor →
                </span>
              </CardContent>
            </Card>
          </button>

          <button
            type="button"
            onClick={() => setMode('ai')}
            disabled={!aiEnabled}
            className="group rounded-2xl text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Card className="h-full border-border bg-card/50 transition group-hover:border-primary/40 group-disabled:group-hover:border-border">
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="size-5 text-primary" />
                </div>
                <CardTitle className="mt-3 flex items-center gap-2 text-base">
                  Create with AI
                </CardTitle>
                <CardDescription>
                  Describe the form in plain English and review the generated draft.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {aiEnabled ? (
                  <span className="text-sm font-medium text-primary group-hover:underline">
                    Open AI generator →
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Set <code className="rounded bg-muted px-1 py-0.5">OPENAI_API_KEY</code> on the server to enable.
                  </span>
                )}
              </CardContent>
            </Card>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setMode('chooser')}
        className="-ml-2 text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to options
      </Button>
      <FormEditor aiEnabled={aiEnabled} showAi={mode === 'ai'} />
    </div>
  )
}
