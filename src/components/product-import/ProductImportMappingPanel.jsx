import { AlertCircle, CheckCircle2, Link2, Sparkles } from 'lucide-react'

function ResolverStatusIcon({ status }) {
  if (status === 'resolved' || status === 'mapped') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
  }
  if (status === 'will_create' || status === 'create') {
    return <Link2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" aria-hidden />
  }
  if (status === 'unresolved') {
    return <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
  }
  return null
}

function ProductImportMappingPanel({ rows = [], autoCreateCatalog = true }) {
  const unresolvedGroups = {}
  const autoCreateGroups = {}

  rows.forEach((row) => {
    ;['category', 'brand', 'unitType'].forEach((fieldKey) => {
      const field = row.resolvers?.[fieldKey]
      const input = field?.input || field?.entityName
      if (!input) return

      if (field.status === 'unresolved') {
        const key = `${fieldKey}:${input}`
        if (!unresolvedGroups[key]) {
          unresolvedGroups[key] = { fieldKey, input, rows: [] }
        }
        unresolvedGroups[key].rows.push(row.rowNumber)
      }

      if (field.status === 'will_create') {
        const key = `${fieldKey}:${input}`
        if (!autoCreateGroups[key]) {
          autoCreateGroups[key] = { fieldKey, input, rows: [] }
        }
        autoCreateGroups[key].rows.push(row.rowNumber)
      }
    })

    ;(row.resolvers?.attributes || []).forEach((attribute) => {
      const label = attribute.value
        ? `${attribute.name || 'Attribute'}: ${attribute.value}`
        : attribute.name || 'Attribute'
      const key = `attribute:${attribute.slot}:${label}`

      if (attribute.status === 'unresolved') {
        if (!unresolvedGroups[key]) {
          unresolvedGroups[key] = { fieldKey: 'attribute', input: label, rows: [] }
        }
        unresolvedGroups[key].rows.push(row.rowNumber)
      }

      if (attribute.status === 'will_create') {
        if (!autoCreateGroups[key]) {
          autoCreateGroups[key] = { fieldKey: 'attribute', input: label, rows: [] }
        }
        autoCreateGroups[key].rows.push(row.rowNumber)
      }
    })
  })

  const unresolved = Object.values(unresolvedGroups)
  const autoCreate = Object.values(autoCreateGroups)

  if (!unresolved.length && !autoCreate.length) {
    return (
      <div className="product-import-mapping-hint rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          All catalog references are ready for import.
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {unresolved.length > 0 ? (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                Manual mapping required
              </p>
              <p className="mt-1 text-sm font-medium text-amber-950 dark:text-amber-100">
                Resolve the items below in the preview table before running the import.
              </p>
            </div>
            <div className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-amber-900 dark:bg-slate-950/40 dark:text-amber-100">
              {unresolved.length} blocking mapping items
            </div>
          </div>

          <ul className="mt-3 space-y-2">
            {unresolved.map((group) => (
              <li
                key={`${group.fieldKey}-${group.input}`}
                className="flex items-start gap-2 rounded-lg bg-white/55 px-3 py-2 text-xs text-amber-950 dark:bg-slate-950/35 dark:text-amber-100"
              >
                <ResolverStatusIcon status="unresolved" />
                <span>
                  <span className="font-medium capitalize">{group.fieldKey}</span>: {group.input}{' '}
                  <span className="text-amber-800/80 dark:text-amber-300/80">
                    (rows {group.rows.join(', ')})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {autoCreateCatalog && autoCreate.length > 0 ? (
        <div className="rounded-lg border border-sky-200/80 bg-sky-50/50 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-950/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-900 dark:text-sky-200">
                <Sparkles className="h-3.5 w-3.5" />
                Auto-create queued
              </p>
              <p className="mt-1 text-sm font-medium text-sky-950 dark:text-sky-100">
                These catalog values can be created during import with auto-create enabled.
              </p>
            </div>
            <div className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-sky-900 dark:bg-slate-950/40 dark:text-sky-100">
              {autoCreate.length} items will be created
            </div>
          </div>

          <ul className="mt-3 space-y-2">
            {autoCreate.map((group) => (
              <li
                key={`create-${group.fieldKey}-${group.input}`}
                className="flex items-start gap-2 rounded-lg bg-white/55 px-3 py-2 text-xs text-sky-950 dark:bg-slate-950/35 dark:text-sky-100"
              >
                <ResolverStatusIcon status="will_create" />
                <span>
                  <span className="font-medium capitalize">{group.fieldKey}</span>: {group.input}{' '}
                  <span className="text-sky-800/80 dark:text-sky-300/80">
                    (rows {group.rows.join(', ')})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export { ResolverStatusIcon }
export default ProductImportMappingPanel
