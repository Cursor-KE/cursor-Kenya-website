export default function AdminLoginLayout ({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      {children}
    </div>
  )
}
