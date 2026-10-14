import './HabitCharacters.css'

const characters = [
  { activity: 'read', tone: 'lavender', x: '15%', y: '17%', delay: '-6s' },
  { activity: 'run', tone: 'mint', x: '70%', y: '14%', delay: '-17s' },
  { activity: 'lift', tone: 'slate', x: '43%', y: '40%', delay: '-11s' },
  { activity: 'meditate', tone: 'mint', x: '12%', y: '69%', delay: '-22s' },
  { activity: 'read', tone: 'slate', x: '77%', y: '62%', delay: '-3s' },
  { activity: 'run', tone: 'lavender', x: '47%', y: '82%', delay: '-14s' },
]

const backgroundCharacters = [
  { activity: 'read', tone: 'lavender', x: '3%', y: '38%', delay: '-6s' },
  { activity: 'run', tone: 'mint', x: '92%', y: '55%', delay: '-17s' },
  { activity: 'meditate', tone: 'slate', x: '16%', y: '82%', delay: '-22s' },
  { activity: 'lift', tone: 'slate', x: '96%', y: '34%', delay: '-11s' },
  { activity: 'read', tone: 'mint', x: '75%', y: '87%', delay: '-3s' },
  { activity: 'run', tone: 'lavender', x: '44%', y: '94%', delay: '-14s' },
]

export function Character({ activity }: { activity: string }) {
  return (
    <svg viewBox="0 0 120 140" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="127" rx="34" ry="5" className="habit-shadow" />
      <g
        className={`habit-person habit-person--${activity}`}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {activity === 'read' || activity === 'meditate' ? (
          <>
            <path
              d="M52 91 31 115 68 119M68 91 89 115 51 119"
              className="habit-trousers"
              strokeWidth="11"
            />
            <path d="M60 57v34" className="habit-shirt" strokeWidth="29" />
            {activity === 'read' ? (
              <>
                <path
                  d="m47 65-15 24 16 6m25-30 15 24-16 6"
                  className="habit-skin-stroke"
                  strokeWidth="8"
                />
                <path
                  d="m33 78 27 8 27-8-3 28-24 7-24-7Z"
                  className="habit-book"
                />
                <path
                  d="M60 86v26"
                  className="habit-page-line"
                  strokeWidth="2"
                />
                <path d="m60 86 13-7-1 26-12 7" className="habit-page" />
              </>
            ) : (
              <path
                d="m47 65-14 28-12 1m52-29 14 28 12 1"
                className="habit-skin-stroke"
                strokeWidth="8"
              />
            )}
          </>
        ) : activity === 'celebrate' ? (
          <>
            <path
              d="m52 90-8 30-12 1m36-31 8 30 12 1"
              className="habit-trousers"
              strokeWidth="11"
            />
            <path d="M60 57v34" className="habit-shirt" strokeWidth="29" />
            <path
              d="m47 63-17-15-8-22m51 37 17-15 8-22"
              className="habit-skin-stroke"
              strokeWidth="8"
            />
          </>
        ) : activity === 'run' ? (
          <>
            <g className="habit-run-leg habit-run-leg--back">
              <path
                d="m60 90-19 18-13 11"
                className="habit-trousers"
                strokeWidth="10"
              />
            </g>
            <g className="habit-run-leg">
              <path
                d="m60 90 19 15 14 17"
                className="habit-trousers"
                strokeWidth="10"
              />
            </g>
            <path d="m66 56-8 34" className="habit-shirt" strokeWidth="27" />
            <g className="habit-run-arm">
              <path
                d="m54 59-17 19 16 8"
                className="habit-skin-stroke"
                strokeWidth="8"
              />
            </g>
            <g className="habit-run-arm habit-run-arm--back">
              <path
                d="m75 60 15-19 12 7"
                className="habit-skin-stroke"
                strokeWidth="8"
              />
            </g>
          </>
        ) : (
          <>
            <path
              d="m52 90-8 30-12 1m36-31 8 30 12 1"
              className="habit-trousers"
              strokeWidth="11"
            />
            <path d="M60 57v34" className="habit-shirt" strokeWidth="29" />
            <g className="habit-lift">
              <path
                d="m47 63-17 13-8-20m51 7 17 13 8-20"
                className="habit-skin-stroke"
                strokeWidth="8"
              />
              <path
                d="M10 54h24m-19-7v14m14-14v14M86 54h24m-19-7v14m14-14v14"
                className="habit-weights"
                strokeWidth="6"
              />
            </g>
          </>
        )}
        <g transform={activity === 'run' ? 'translate(9 -2)' : undefined}>
          <ellipse cx="60" cy="35" rx="12" ry="15" className="habit-skin" />
          <path
            d="M48 35c-6-20 25-23 25-4-8 1-12-2-17-6l-3 13Z"
            className="habit-hair"
          />
          <path d="M63 39h3" className="habit-face" strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  )
}

export default function HabitCharacters({
  background = false,
}: {
  background?: boolean
}) {
  return (
    <div
      className={`habit-characters${background ? ' habit-characters--app' : ''}`}
      aria-hidden="true"
    >
      {(background ? backgroundCharacters : characters).map(
        ({ activity, tone, x, y, delay }, index) => (
          <div
            key={index}
            className={`habit-float habit-tone--${tone}`}
            style={{ left: x, top: y, animationDelay: delay }}
          >
            <Character activity={activity} />
          </div>
        ),
      )}
    </div>
  )
}
