import type { QueryClient } from '@tanstack/react-query'

export function bindSessionEvents(client: QueryClient, target: Window) {
  let channel: BroadcastChannel | null = null
  try {
    const Channel = (
      target as Window & { BroadcastChannel?: typeof BroadcastChannel }
    ).BroadcastChannel
    if (Channel) channel = new Channel('donetoday-session')
  } catch {
    /* Focus verification remains available when channels are blocked. */
  }
  const verify = () => {
    void client.invalidateQueries(
      { queryKey: ['session'], exact: true },
      { cancelRefetch: false },
    )
  }
  const restored = (event: PageTransitionEvent) => {
    if (event.persisted) verify()
  }
  const notify = () => {
    try {
      channel?.postMessage({ type: 'session-changed' })
    } catch {
      /* Verify on return instead. */
    }
  }
  const receive = (event: MessageEvent) => {
    if (event.data?.type === 'session-changed') verify()
  }
  const expire = async () => {
    await client.cancelQueries()
    client.clear()
    client.setQueryData(['session'], null)
  }
  const resetPrivateData = () => {
    const filter = {
      predicate: (query: { queryKey: readonly unknown[] }) =>
        query.queryKey[0] !== 'session',
    }
    void client.cancelQueries(filter)
    client.removeQueries(filter)
  }
  target.addEventListener('focus', verify)
  target.addEventListener('pageshow', restored)
  target.addEventListener('session-expired', expire)
  target.addEventListener('account-changed', resetPrivateData)
  target.addEventListener('session-updated', notify)
  channel?.addEventListener('message', receive)
  return () => {
    target.removeEventListener('focus', verify)
    target.removeEventListener('pageshow', restored)
    target.removeEventListener('session-expired', expire)
    target.removeEventListener('account-changed', resetPrivateData)
    target.removeEventListener('session-updated', notify)
    channel?.removeEventListener('message', receive)
    channel?.close()
  }
}
