import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { languages } from '../i18n'
import Icon from './ui/Icon'

export default function LanguageSelector({
  fullWidth = false,
}: {
  fullWidth?: boolean
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const items = useRef<Array<HTMLButtonElement | null>>([])
  const selected = Math.max(
    0,
    languages.findIndex((language) => language.code === i18n.resolvedLanguage),
  )

  useEffect(() => {
    if (!open) return
    items.current[selected]?.focus()
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false)
    }
    const focusOutside = (event: FocusEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', focusOutside)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', focusOutside)
    }
  }, [open, selected])

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'Tab') {
      close()
      return
    }
    const current = items.current.findIndex(
      (item) => item === document.activeElement,
    )
    let next = current
    if (event.key === 'ArrowDown') next = (current + 1) % languages.length
    else if (event.key === 'ArrowUp')
      next = (current + languages.length - 1) % languages.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = languages.length - 1
    else if (event.key.length === 1) {
      for (let offset = 1; offset <= languages.length; offset++) {
        const index = (current + offset) % languages.length
        if (
          languages[index].label
            .toLowerCase()
            .startsWith(event.key.toLowerCase())
        ) {
          next = index
          break
        }
      }
    }
    if (next !== current) {
      event.preventDefault()
      items.current[next]?.focus()
    }
  }
  return (
    <div
      ref={root}
      className={`relative shrink-0 ${fullWidth ? 'w-full' : ''}`}
    >
      <button
        ref={trigger}
        type="button"
        id={`${id}-trigger`}
        aria-label={`${t('settings.language')}: ${languages[selected].label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors ${fullWidth ? 'w-full justify-between' : ''} ${open ? 'border-primary/50 bg-elevated text-primary' : 'border-muted/20 bg-surface text-foreground hover:border-primary/40 hover:bg-elevated'}`}
      >
        <span>{languages[selected].label}</span>
        <Icon
          name="arrow"
          className={`h-3.5 w-3.5 text-muted transition-transform ${open ? '-rotate-90' : 'rotate-90'}`}
        />
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-labelledby={`${id}-trigger`}
          onKeyDown={keyboard}
          className={`absolute right-0 top-full z-30 mt-2 rounded-xl border border-muted/20 bg-surface p-1.5 shadow-xl ${fullWidth ? 'w-full' : 'w-44'}`}
        >
          {languages.map((language, index) => (
            <button
              key={language.code}
              ref={(element) => {
                items.current[index] = element
              }}
              type="button"
              role="menuitemradio"
              aria-checked={index === selected}
              tabIndex={-1}
              lang={language.code}
              onClick={() => {
                void i18n.changeLanguage(language.code)
                close()
              }}
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm outline-offset-0 hover:bg-elevated focus-visible:bg-elevated ${index === selected ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground'}`}
            >
              {language.label}
              {index === selected && <Icon name="check" className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
