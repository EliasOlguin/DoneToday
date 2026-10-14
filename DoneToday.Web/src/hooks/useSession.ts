import { useQuery } from '@tanstack/react-query'
import { getSession } from '../api/auth'

export function useSession({
  verifyOnMount = false,
}: { verifyOnMount?: boolean } = {}) {
  return useQuery({
    queryKey: ['session'],
    queryFn: ({ signal }) => getSession(signal),
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: 'always',
    refetchOnMount: verifyOnMount ? 'always' : true,
  })
}
