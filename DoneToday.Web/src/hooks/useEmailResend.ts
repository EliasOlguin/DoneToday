import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authPost } from '../api/auth'

export function useEmailResend(email: string, path = 'resend-confirmation') {
  const recipient = email.trim().toLowerCase()
  const [cooldown, setCooldown] = useState({ email: '', until: 0 })
  const [now, setNow] = useState(Date.now)
  const beginCooldown = (address: string, seconds = 60) => {
    const current = Date.now()
    setNow(current)
    setCooldown({
      email: address.trim().toLowerCase(),
      until: current + Math.min(86_400, Math.max(1, seconds)) * 1000,
    })
  }
  const mutation = useMutation({
    meta: { localLoading: true },
    mutationFn: ({ email }: { email: string }) => authPost(path, { email }),
    onSettled: (_, error, request) =>
      beginCooldown(
        request.email,
        error && 'retryAfter' in error && typeof error.retryAfter === 'number'
          ? error.retryAfter
          : 60,
      ),
  })
  useEffect(() => {
    if (!cooldown.until) return
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= cooldown.until) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown.until])
  const seconds =
    cooldown.email === recipient
      ? Math.max(0, Math.ceil((cooldown.until - now) / 1000))
      : 0
  const sameRecipient = mutation.variables?.email === recipient
  return {
    pending: mutation.isPending,
    seconds,
    sent: sameRecipient && mutation.isSuccess,
    error: sameRecipient ? mutation.error : null,
    send: () => {
      if (recipient && !seconds && !mutation.isPending)
        mutation.mutate({ email: recipient })
    },
    beginCooldown,
  }
}
