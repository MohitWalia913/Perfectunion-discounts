type Props = {
  title: string
  description?: string
}

export function DashboardPlaceholderPage({ title, description }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 lg:p-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            This section is coming soon.
          </p>
        )}
      </div>
    </div>
  )
}
