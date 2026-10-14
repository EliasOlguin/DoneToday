import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router'

const sections = ['today', 'habits', 'progress', 'settings']

export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const previousPath = useRef(pathname)
  const container = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const previous = previousPath.current
    previousPath.current = pathname
    const element = container.current
    if (!element || previous === pathname) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotion.matches) return

    const from = sections.indexOf(previous.split('/')[1])
    const to = sections.indexOf(pathname.split('/')[1])
    const direction =
      from >= 0 && to >= 0 && from !== to
        ? Math.sign(to - from)
        : navigationType === 'POP'
          ? -1
          : 1

    const animation = element.animate(
      [
        { opacity: 0.35, transform: `translateX(${direction * 18}px)` },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { duration: 260, easing: 'cubic-bezier(.2, .7, .25, 1)' },
    )
    const stop = () => animation.cancel()
    reducedMotion.addEventListener('change', stop)
    return () => {
      animation.cancel()
      reducedMotion.removeEventListener('change', stop)
    }
  }, [pathname, navigationType])

  return <div ref={container}>{children}</div>
}
