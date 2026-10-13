import { errorText } from '../api/errors'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useContext } from 'react'
import { ThemeContext } from '../context/theme'
import { getArchivedHabits, restoreHabit } from '../api/habits'
import { formatSchedule } from '../lib/format'
import { languages } from '../i18n'
import Icon from '../components/ui/Icon'
import { authPost } from '../api/auth'
import { useSession } from '../hooks/useSession'
import { useNavigate } from 'react-router'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useContext(ThemeContext)
  const client = useQueryClient()
  const session = useSession()
  const navigate = useNavigate()
  const logout = useMutation({
    mutationFn: () => authPost('logout'),
    onSuccess: async () => {
      await client.cancelQueries()
      client.clear()
      client.setQueryData(['session'], null)
      navigate('/login', { replace: true })
    },
  })
  const archived = useQuery({
    queryKey: ['habits', 'archived'],
    queryFn: getArchivedHabits,
  })
  const restore = useMutation({
    mutationFn: restoreHabit,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['habits'] }),
        client.invalidateQueries({ queryKey: ['today'] }),
        client.invalidateQueries({ queryKey: ['progress'] }),
      ]),
  })
  return (
    <section aria-labelledby="settings-title">
      <h1 id="settings-title" className="page-title">
        {t('nav.settings')}
      </h1>
      <p className="mt-2 text-sm text-muted">{t('settings.tagline')}</p>
      <section className="panel mt-4 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon name="user" className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold">{t('auth.account')}</h2>
          <p className="mt-1 break-all text-sm text-muted">
            {session.data?.email}
          </p>
        </div>
      </section>
      <section className="panel mt-6">
        <h2 className="font-semibold">{t('settings.appearance')}</h2>
        <p className="mt-1 text-sm text-muted">{t('settings.themeHelp')}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(['dark', 'light'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className={`min-h-11 rounded-xl text-sm font-medium ${theme === value ? 'bg-primary text-background' : 'bg-elevated text-muted'}`}
            >
              {value === 'dark' ? t('settings.dark') : t('settings.light')}
            </button>
          ))}
        </div>
      </section>
      <section className="panel mt-4">
        <h2 className="font-semibold">{t('settings.language')}</h2>
        <label htmlFor="language" className="sr-only">
          {t('settings.language')}
        </label>
        <select
          id="language"
          value={i18n.resolvedLanguage ?? 'en'}
          onChange={(event) => void i18n.changeLanguage(event.target.value)}
          className="field mt-3"
        >
          {languages.map((language) => (
            <option
              key={language.code}
              value={language.code}
              lang={language.code}
            >
              {language.label}
            </option>
          ))}
        </select>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {t('settings.languageHelp')}
        </p>
      </section>
      <section className="panel mt-4">
        <h2 className="font-semibold">{t('settings.daily')}</h2>
        <p className="mt-2 text-sm text-muted">{t('settings.dailyHelp')}</p>
      </section>
      <section className="mt-6" aria-labelledby="security-title">
        <h2 id="security-title" className="mb-3 text-lg font-semibold">
          {t('settings.security')}
        </h2>
        <Link
          to="/settings/security"
          className="panel flex items-center gap-3 transition-colors hover:border-primary/40 hover:bg-elevated"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon name="shield" className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              {t('twoFactor.title')}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              {t('twoFactor.help')}
            </span>
          </span>
          <Icon name="arrow" className="h-5 w-5 shrink-0 text-muted" />
        </Link>
      </section>
      <Link
        to="/settings/connections"
        className="panel mt-4 flex items-center justify-between gap-3 text-sm font-semibold"
      >
        <span>{t('google.connections')}</span>
        <Icon name="arrow" className="h-5 w-5 text-muted" />
      </Link>
      <section className="mt-7" aria-labelledby="archived-title">
        <h2 id="archived-title" className="mb-3 text-lg font-semibold">
          {t('settings.archived')}
        </h2>
        <p className="mb-4 text-sm text-muted">{t('settings.archiveHelp')}</p>
        {archived.isPending ? (
          <p role="status" className="text-muted">
            {t('settings.loading')}
          </p>
        ) : archived.isError ? (
          <p role="alert" className="text-danger">
            {errorText(archived.error)}
          </p>
        ) : archived.data.length === 0 ? (
          <p className="panel text-sm text-muted">{t('settings.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {archived.data.map((habit) => (
              <li key={habit.id} className="panel flex items-center gap-3">
                <Icon
                  name="habit"
                  style={{ color: habit.color ?? 'var(--color-primary)' }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold">
                    {habit.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {formatSchedule(habit.daysOfWeek)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={restore.isPending}
                  onClick={() => restore.mutate(habit.id)}
                  className="min-h-11 rounded-xl px-3 text-sm font-medium text-primary disabled:opacity-50"
                >
                  {restore.isPending && restore.variables === habit.id
                    ? t('settings.restoring')
                    : t('settings.restore')}
                </button>
              </li>
            ))}
          </ul>
        )}
        {restore.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {errorText(restore.error)}
          </p>
        )}
        {restore.isSuccess && (
          <p role="status" className="mt-3 text-sm text-success">
            {t('settings.restored')}{' '}
            <Link to="/habits" className="underline">
              {t('settings.view')}
            </Link>
          </p>
        )}
      </section>
      <div className="mt-8 border-t border-muted/15 pt-6">
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-danger/25 bg-danger/5 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <Icon name="logout" />
          {t('auth.logout')}
        </button>
        {logout.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {t('auth.logoutError')}
          </p>
        )}
      </div>
    </section>
  )
}
