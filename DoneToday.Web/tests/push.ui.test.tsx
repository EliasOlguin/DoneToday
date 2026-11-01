import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { enablePush } from '../src/lib/push'
import { subscribeDevice } from '../src/api/notifications'
vi.mock('../src/api/notifications', () => ({
  subscribeDevice: vi.fn(),
  removeDevice: vi.fn(),
}))

const createSubscription = () => ({
  endpoint: 'https://fcm.googleapis.com/test',
  options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
  toJSON: () => ({ keys: { p256dh: 'test-key', auth: 'test-auth' } }),
  unsubscribe: vi.fn().mockResolvedValue(true),
})
let previous: ReturnType<typeof createSubscription>
let replacement: ReturnType<typeof createSubscription>
let registration: {
  pushManager: {
    getSubscription: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  Object.defineProperty(window, 'isSecureContext', {
    value: true,
    configurable: true,
  })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  })
  previous = createSubscription()
  replacement = createSubscription()
  registration = {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(previous),
      subscribe: vi.fn().mockResolvedValue(replacement),
    },
  }
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    },
  })
  vi.mocked(subscribeDevice).mockResolvedValue({ id: 3 })
})
afterEach(() => vi.unstubAllGlobals())
test('permission refusal never registers a server device', async () => {
  vi.mocked(Notification.requestPermission).mockResolvedValue('denied')
  await expect(enablePush('AQID', 1)).rejects.toThrow()
  expect(subscribeDevice).not.toHaveBeenCalled()
})
test('a changed server public key replaces the old browser subscription', async () => {
  await enablePush('BAUG', 1)
  expect(previous.unsubscribe).toHaveBeenCalledOnce()
  expect(registration.pushManager.subscribe).toHaveBeenCalledOnce()
  expect(localStorage.getItem('donetoday-push-device:1')).toBe('3')
})
test('failed server registration cleans up a newly created browser subscription', async () => {
  registration.pushManager.getSubscription.mockResolvedValue(null)
  vi.mocked(subscribeDevice).mockRejectedValue(new Error('network'))
  await expect(enablePush('AQID', 1)).rejects.toThrow('network')
  expect(replacement.unsubscribe).toHaveBeenCalledOnce()
  expect(localStorage.getItem('donetoday-push-device:1')).toBeNull()
})
