import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useIdentity } from '@/lib/identity-context'

export const Route = createFileRoute('/')({
  component: IndexRedirect,
})

function IndexRedirect() {
  const { user, ready } = useIdentity()
  const navigate = useNavigate()

  useEffect(() => {
    if (!ready) return
    if (user) {
      navigate({ to: '/boards' })
    } else {
      navigate({ to: '/login' })
    }
  }, [ready, user, navigate])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
