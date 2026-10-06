export default function TodayPage() {
  return (
    <section aria-labelledby="today-title">
      <h1 id="today-title" className="text-2xl font-bold">
        Today
      </h1>

      <p className="mt-2 text-slate-600">
        One habit at a time.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="font-medium">Your day starts here.</p>
        <p className="mt-2 text-sm text-slate-600">
          Here we will show the habits scheduled for today.
        </p>
      </div>
    </section>
  )
}