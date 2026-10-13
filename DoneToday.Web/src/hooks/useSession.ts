import { useQuery } from '@tanstack/react-query'
import { getSession } from '../api/auth'

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: getSession,
    retry: false,
    staleTime: 60_000,
  })
}
