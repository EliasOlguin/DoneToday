import { useTranslation } from 'react-i18next'

export default function PasswordRequirements({
  password,
}: {
  password: string
}) {
  const { t } = useTranslation()
  const passwordRequirements = [
    { key: 'auth.passwordLength', met: password.length >= 12 },
    { key: 'auth.passwordUppercase', met: /[A-Z]/.test(password) },
    { key: 'auth.passwordLowercase', met: /[a-z]/.test(password) },
    { key: 'auth.passwordNumber', met: /[0-9]/.test(password) },
    { key: 'auth.passwordSpecial', met: /[^A-Za-z0-9]/.test(password) },
  ] as const
  return (
    <ul id="password-help" className="space-y-2 text-sm">
      {passwordRequirements.map(({ key, met }) => (
        <li
          key={key}
          className={`flex items-center gap-2 transition-colors ${met ? 'text-success' : 'text-muted'}`}
        >
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs"
          >
            {met ? '✓' : '•'}
          </span>
          <span>{t(key)}</span>
          <span className="sr-only">
            {t(met ? 'auth.requirementMet' : 'auth.requirementPending')}
          </span>
        </li>
      ))}
    </ul>
  )
}
