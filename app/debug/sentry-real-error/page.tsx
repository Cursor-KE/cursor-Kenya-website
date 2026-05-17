type Session = { user?: { email: string } }

export default function SentryRealErrorPage() {
  const session: Session = { user: undefined }
  const email = session.user?.email

  return (
    <main className="p-6">
      <p className="text-muted-foreground">
        {email ?? 'No user in session (expected for this placeholder).'}
      </p>
    </main>
  )
}
