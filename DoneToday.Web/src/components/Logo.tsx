export default function Logo({
  className = 'h-9 w-9',
}: {
  className?: string
}) {
  return (
    <img
      src="/brand/logo.svg"
      alt=""
      width="64"
      height="64"
      className={`shrink-0 ${className}`}
    />
  )
}
