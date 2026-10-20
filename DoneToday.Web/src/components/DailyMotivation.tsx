import { useTranslation } from 'react-i18next'
import { getDailyMotivation } from '../lib/dailyMotivation'

export default function DailyMotivation({
  now,
  timeZone,
}: {
  now: Date
  timeZone: string
}) {
  const { t, i18n } = useTranslation()
  const { textKey, source } = getDailyMotivation(now, timeZone)
  const translated = i18n.resolvedLanguage !== 'en'

  return (
    <figure className="mt-5 max-w-xl border-l-2 border-primary/60 pl-4">
      <blockquote className="text-sm leading-relaxed text-foreground/85">
        <p>{t(textKey)}</p>
      </blockquote>
      <figcaption className="mt-2 text-xs leading-relaxed text-muted">
        {source ? (
          <>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-muted/30 underline-offset-4 hover:text-primary"
            >
              <cite className="not-italic">{t(source.labelKey)}</cite>
            </a>
            {translated && source.kind === 'excerpt' && (
              <span className="mt-0.5 block">
                {t('motivation.translationNote')}
              </span>
            )}
          </>
        ) : (
          'DoneToday'
        )}
      </figcaption>
    </figure>
  )
}
