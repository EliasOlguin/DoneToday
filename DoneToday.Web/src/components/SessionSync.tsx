import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { bindSessionEvents } from '../api/sessionEvents'

export default function SessionSync() {
  const client = useQueryClient()
  useEffect(() => bindSessionEvents(client, window), [client])
  return null
}
