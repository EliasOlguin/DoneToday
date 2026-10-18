import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value() {
    this.setAttribute('open', '')
  },
})
Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true,
  value() {
    this.removeAttribute('open')
  },
})
