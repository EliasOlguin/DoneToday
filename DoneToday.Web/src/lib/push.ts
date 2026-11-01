import { subscribeDevice, removeDevice } from '../api/notifications'

export function pushStatus() {
  if (
    !window.isSecureContext ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  )
    return 'unsupported'
  return Notification.permission === 'denied' ? 'denied' : 'available'
}
export function readDeviceId(userId: number): number | null {
  try {
    const id = Number(localStorage.getItem(`donetoday-push-device:${userId}`))
    return id > 0 ? id : null
  } catch {
    return null
  }
}
export async function enablePush(publicKey: string, userId: number) {
  if (pushStatus() !== 'available') throw new Error('unsupported')
  // Permission is requested only as a result of the activation button.
  if ((await Notification.requestPermission()) !== 'granted')
    throw new Error('permission')
  const registration = await navigator.serviceWorker.register(
    '/push-worker.js',
    { scope: '/', updateViaCache: 'none' },
  )
  await navigator.serviceWorker.ready
  let previous = await registration.pushManager.getSubscription()
  const bytes = Uint8Array.from(
    atob(publicKey.replaceAll('-', '+').replaceAll('_', '/')),
    (character) => character.charCodeAt(0),
  )
  if (previous) {
    const previousKey = previous.options.applicationServerKey
    const sameKey =
      previousKey &&
      previousKey.byteLength === bytes.byteLength &&
      new Uint8Array(previousKey).every((byte, index) => byte === bytes[index])
    if (!sameKey) {
      if (!(await previous.unsubscribe())) throw new Error('subscription')
      previous = null
    }
  }
  const subscription =
    previous ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes,
    }))
  const json = subscription.toJSON()
  try {
    const result = await subscribeDevice({
      endpoint: subscription.endpoint,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    })
    try {
      localStorage.setItem(`donetoday-push-device:${userId}`, String(result.id))
    } catch {
      /* UI state still works. */
    }
    return result.id
  } catch (error) {
    if (!previous) await subscription.unsubscribe().catch(() => false)
    throw error
  }
}
export async function disablePush(id: number, userId: number) {
  // Remove the server subscription first; browser failures cannot keep server delivery enabled.
  await removeDevice(id)
  const registration =
    await navigator.serviceWorker.getRegistration('/push-worker.js')
  await (
    await registration?.pushManager.getSubscription()
  )
    ?.unsubscribe()
    .catch(() => false)
  try {
    localStorage.removeItem(`donetoday-push-device:${userId}`)
  } catch {
    /* Storage is optional. */
  }
}
