import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from './ui/Icon'

export default function PasswordField({
  label,
  id,
  className = '',
  style,
  disabled,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()
  const action = t(visible ? 'auth.hidePassword' : 'auth.showPassword')
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          {...props}
          id={inputId}
          disabled={disabled}
          type={visible ? 'text' : 'password'}
          className={`field ${className}`}
          style={{ ...style, paddingRight: '3.25rem' }}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={`${action}: ${label}`}
          title={action}
          aria-controls={inputId}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-muted transition-colors hover:text-primary disabled:opacity-40"
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} />
        </button>
      </div>
    </div>
  )
}
