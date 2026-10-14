import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { bindSessionEvents } from '../api/sessionEvents'
import { useSession } from '../hooks/useSession'
import { useNow } from '../hooks/useNow'

export default function SessionSync() {
  const client = useQueryClient()
  const session = useSession()
  const now = useNow()
  const previousDay = useRef<string | null>(null)
  const day = session.data
    ? `${session.data.id}:${session.data.timeZoneId}:${new Intl.DateTimeFormat('en-CA', { timeZone: session.data.timeZoneId ?? 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)}`
    : null
  useEffect(() => bindSessionEvents(client, window), [client])
  useEffect(() => {
    if (previousDay.current && day && previousDay.current !== day) {
      for (const key of ['today', 'progress', 'habit'])
        void client.invalidateQueries({ queryKey: [key] })
    }
    previousDay.current = day
  }, [day, client])
  return null
}
