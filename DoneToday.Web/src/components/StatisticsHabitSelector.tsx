import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Habit } from '../types/Habit'
import { resolveHabitIcon } from '../lib/habitIcons'
import Icon from './ui/Icon'

export default function StatisticsHabitSelector({
  habits,
  value,
  onChange,
}: {
  habits?: Habit[]
  value?: number
  onChange: (id: number | undefined) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const items = useRef<Array<HTMLButtonElement | null>>([])
  const options = [
    {
      id: undefined as number | undefined,
      name: t('stats.allHabits'),
      icon: 'chart' as const,
      color: null,
    },
    ...(habits ?? []),
  ]
  const selected = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  )
  useEffect(() => {
    if (!open) return
    items.current[selected]?.focus()
    const outside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
    }
  }, [open, selected])
  function close() {
    setOpen(false)
    trigger.current?.focus()
  }
  function keyboard(event: KeyboardEvent) {
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
    if (event.key === 'ArrowDown') next = (current + 1) % options.length
    else if (event.key === 'ArrowUp')
      next = (current + options.length - 1) % options.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = options.length - 1
    else if (event.key.length === 1) {
      for (let offset = 1; offset <= options.length; offset++) {
        const index = (current + offset) % options.length
        if (
          options[index].name.toLowerCase().startsWith(event.key.toLowerCase())
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
    <div ref={root} className="relative">
      <span id={`${id}-label`} className="mb-2 block text-sm font-medium">
        {t('stats.filter')}
      </span>
      <button
        ref={trigger}
        type="button"
        disabled={!habits}
        aria-labelledby={`${id}-label ${id}-value`}
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
        className={`flex min-h-12 w-full items-center gap-3 rounded-xl border bg-surface px-3 text-sm text-foreground transition-colors ${open ? 'border-primary/50' : 'border-muted/20 hover:border-primary/40'}`}
      >
        <Icon
          name={value ? resolveHabitIcon(options[selected].icon) : 'chart'}
          style={{ color: options[selected].color ?? 'var(--color-primary)' }}
          className="h-5 w-5 shrink-0"
        />
        <span id={`${id}-value`} className="min-w-0 flex-1 truncate text-left">
          {options[selected].name}
        </span>
        <Icon
          name="arrow"
          className={`h-3.5 w-3.5 shrink-0 text-muted ${open ? '-rotate-90' : 'rotate-90'}`}
        />
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-labelledby={`${id}-label`}
          onKeyDown={keyboard}
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-muted/20 bg-surface p-1.5 shadow-xl"
        >
          {options.map((option, index) => (
            <button
              key={option.id ?? 'all'}
              ref={(element) => {
                items.current[index] = element
              }}
              type="button"
              role="menuitemradio"
              aria-checked={index === selected}
              tabIndex={-1}
              onClick={() => {
                onChange(option.id)
                close()
              }}
              className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm outline-offset-0 hover:bg-elevated focus-visible:bg-elevated ${index === selected ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground'}`}
            >
              <Icon
                name={option.id ? resolveHabitIcon(option.icon) : 'chart'}
                style={{ color: option.color ?? 'var(--color-primary)' }}
                className="h-4 w-4 shrink-0"
              />
              <span className="min-w-0 flex-1 break-words">{option.name}</span>
              {index === selected && (
                <Icon name="check" className="h-4 w-4 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
