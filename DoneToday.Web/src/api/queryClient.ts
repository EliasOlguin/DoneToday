import { QueryClient } from '@tanstack/react-query'
import type { Query } from '@tanstack/react-query'

export function isInitialRequest(query: Query) {
  return query.meta?.localLoading !== true && query.state.data === undefined
}

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
      },
    },
  })
}
