export default function Page() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-20">
      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="text-4xl">
          Header <span className="text-gradient">wired up</span>
        </h1>
        <p className="text-muted-foreground">
          The marketing header is mounted in the root layout, so it sits above
          every route. It is sticky — scroll to see it hold the top edge.
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd>, or use the toggle, to switch themes)
        </p>
      </div>
      <div className="h-[150vh]" />
    </main>
  )
}
