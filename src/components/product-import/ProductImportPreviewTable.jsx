import { Fragment, useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import { ResolverStatusIcon } from '@/components/product-import/ProductImportMappingPanel'
import { cn } from '@/lib/utils'

const badgeClass = {
  Duplicate:
    'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
  Update:
    'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/35 dark:text-sky-300 dark:ring-sky-900/50',
  New: 'bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/35 dark:text-violet-300 dark:ring-violet-900/50',
  'Needs mapping':
    'bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950/35 dark:text-orange-300 dark:ring-orange-900/50',
  'Auto-create':
    'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/35 dark:text-sky-300 dark:ring-sky-900/50',
}

const stateBadgeMap = {
  valid:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  new: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300',
  update:
    'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
  duplicate:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  skip: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  conflict:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  resolved:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  needs_mapping:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
}

const reviewLabelMap = {
  valid: 'Ready',
  warning: 'Needs review',
  error: 'Blocking issues',
}

const duplicateLabelMap = {
  new: 'New',
  update: 'Will update',
  duplicate: 'Duplicate',
  skip: 'Skipped',
  conflict: 'Conflict',
}

const resolverLabelMap = {
  resolved: 'Resolved',
  needs_mapping: 'Needs mapping',
}

const severityToneMap = {
  error:
    'border-red-200/80 bg-red-50/80 text-red-900 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-100',
  warning:
    'border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100',
}

const displayOrDash = (value) => {
  const text = String(value ?? '').trim()
  return text || '—'
}

const formatReviewMeta = (row) => {
  const errorCount = row.errors?.length || 0
  const warningCount = row.warnings?.length || 0
  const parts = [displayOrDash(row.status || 'draft')]
  if (errorCount > 0) parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`)
  if (warningCount > 0) parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`)
  if (errorCount === 0 && warningCount === 0) parts.push('No issues')
  return parts.join(' · ')
}

const normalizeValidationItems = (row) => {
  const fromDetails = [
    ...((row.errorDetails || []).map((item, index) => ({
      id: `error-${row.rowNumber}-${index}`,
      severity: 'error',
      field: item.field || '',
      message: item.message || '',
      value: item.value || '',
    })) || []),
    ...((row.warningDetails || []).map((item, index) => ({
      id: `warning-${row.rowNumber}-${index}`,
      severity: 'warning',
      field: item.field || '',
      message: item.message || '',
      value: item.value || '',
    })) || []),
  ]

  if (fromDetails.length > 0) return fromDetails

  return [
    ...(row.errors || []).map((message, index) => ({
      id: `error-fallback-${row.rowNumber}-${index}`,
      severity: 'error',
      field: '',
      message,
      value: '',
    })),
    ...(row.warnings || []).map((message, index) => ({
      id: `warning-fallback-${row.rowNumber}-${index}`,
      severity: 'warning',
      field: '',
      message,
      value: '',
    })),
  ]
}

function RowBadges({ badges = [] }) {
  const visibleBadges = badges.filter((badge) => !['Valid', 'Warning', 'Error'].includes(badge))
  if (!visibleBadges.length) return <span className="text-xs text-slate-400">No extra flags</span>

  return (
    <div className="flex flex-wrap gap-1">
      {visibleBadges.map((badge) => (
        <Badge
          key={badge}
          className={cn(
            'rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
            badgeClass[badge] || badgeClass.New,
          )}
        >
          {badge}
        </Badge>
      ))}
    </div>
  )
}

function StateBadge({ value, label = value }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        stateBadgeMap[value] ||
          'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
      )}
    >
      {label}
    </span>
  )
}

const getResolverCounts = (row) => {
  const catalogResolvers = ['category', 'brand', 'unitType']
  const unresolvedCatalog = catalogResolvers.filter(
    (fieldKey) => row.resolvers?.[fieldKey]?.status === 'unresolved',
  )
  const unresolvedAttributes = (row.resolvers?.attributes || []).filter(
    (attribute) => attribute.status === 'unresolved',
  )

  return {
    unresolvedCatalog,
    unresolvedAttributes,
  }
}

const getAttributeMapping = (rowMappings, rowNumber, slot) =>
  rowMappings?.[rowNumber]?.attributes?.find((item) => Number(item.slot) === Number(slot)) || null

function ProductImportPreviewTable({
  rows = [],
  resolverOptions,
  rowMappings,
  onRowMappingChange,
  onAttributeMappingChange,
}) {
  const [expandedRows, setExpandedRows] = useState({})

  const toggleRow = (rowNumber) => {
    setExpandedRows((current) => ({
      ...current,
      [rowNumber]: !current[rowNumber],
    }))
  }

  const attributeOptions = useMemo(() => resolverOptions?.attributes || [], [resolverOptions])

  const columns = [
    { key: 'expand', label: '', headClassName: 'w-10' },
    { key: 'row', label: 'Row', headClassName: 'w-16' },
    { key: 'name', label: 'Product', headClassName: 'min-w-[14rem]' },
    { key: 'review', label: 'Review', headClassName: 'min-w-[18rem]' },
    { key: 'duplicate', label: 'Duplicate', headClassName: 'min-w-[10rem]' },
    { key: 'resolver', label: 'Mapping', headClassName: 'min-w-[11rem]' },
    { key: 'badges', label: 'Flags', headClassName: 'min-w-[9rem]' },
  ]

  const renderResolverSelect = (row, fieldKey, options = []) => {
    const resolver = row.resolvers?.[fieldKey]
    if (!resolver?.input || ['resolved', 'mapped', 'create', 'will_create'].includes(resolver.status)) {
      return <span className="text-xs text-slate-500">{resolver?.entityName || resolver?.input || '—'}</span>
    }

    const mapping = rowMappings?.[row.rowNumber]?.[fieldKey] || {}
    return (
      <select
        className="h-9 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        value={mapping.action === 'use_existing' ? mapping.entityId || '' : ''}
        onChange={(event) => {
          const value = event.target.value
          if (!value) {
            onRowMappingChange(row.rowNumber, fieldKey, null)
            return
          }
          if (value.startsWith('__create__:')) {
            onRowMappingChange(row.rowNumber, fieldKey, {
              action: 'create',
              name: value.replace('__create__:', ''),
            })
            return
          }
          const option = options.find((item) => item.id === value)
          onRowMappingChange(row.rowNumber, fieldKey, {
            action: 'use_existing',
            entityId: value,
            entityName: option?.name || resolver.input,
          })
        }}
      >
        <option value="">Map {fieldKey}…</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
        <option value={`__create__:${resolver.input}`}>Create "{resolver.input}"</option>
      </select>
    )
  }

  const renderAttributeMappingControl = (row, attribute) => {
    const mapping = getAttributeMapping(rowMappings, row.rowNumber, attribute.slot)
    const selectedAttributeId = mapping?.attributeId || attribute.attributeId || ''
    const valueLabel = mapping?.valueLabel ?? attribute.valueLabel ?? attribute.value ?? ''
    const canEditValue = Boolean(selectedAttributeId) && Boolean(attribute.value)
    const attributeStatusLabel =
      attribute.status === 'will_create'
        ? 'Auto-create'
        : attribute.status === 'resolved' || attribute.status === 'mapped'
          ? 'Resolved'
          : 'Needs mapping'

    return (
      <div
        key={`attribute-slot-${attribute.slot}`}
        className="rounded-lg border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/40"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Attribute slot {attribute.slot}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Imported name: {attribute.name || '—'}
              {attribute.value ? ` · Imported value: ${attribute.value}` : ''}
            </p>
          </div>
          <StateBadge
            value={attribute.status === 'unresolved' ? 'needs_mapping' : 'resolved'}
            label={attributeStatusLabel}
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Map to existing attribute
            </label>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={selectedAttributeId}
              onChange={(event) => {
                const attributeId = event.target.value

                if (!attributeId) {
                  onAttributeMappingChange(row.rowNumber, attribute.slot, null)
                  return
                }

                onAttributeMappingChange(row.rowNumber, attribute.slot, {
                  action: 'use_existing',
                  attributeId,
                  valueLabel: attribute.value ? valueLabel || attribute.value : undefined,
                })
              }}
            >
              <option value="">Select attribute…</option>
              {attributeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          {attribute.value ? (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Value label for import
              </label>
              <Input
                value={valueLabel}
                disabled={!canEditValue}
                placeholder="Enter attribute value"
                onChange={(event) => {
                  if (!selectedAttributeId) return

                  onAttributeMappingChange(row.rowNumber, attribute.slot, {
                    action: 'use_existing',
                    attributeId: selectedAttributeId,
                    valueLabel: event.target.value,
                  })
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const renderDetailField = (label, rawValue, resolvedValue) => (
    <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/40">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
        {displayOrDash(rawValue)}
      </p>
      {resolvedValue !== undefined ? (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Final import: {displayOrDash(resolvedValue)}
        </p>
      ) : null}
    </div>
  )

  return (
    <ModuleTable
      columns={columns}
      data={rows}
      compact
      stickyHeader
      className="shadow-none"
      emptyMessage="No rows parsed."
      renderRow={(row, index) => {
        const isExpanded = Boolean(expandedRows[row.rowNumber])
        const { unresolvedCatalog, unresolvedAttributes } = getResolverCounts(row)
        const validationItems = normalizeValidationItems(row)
        const firstIssue = validationItems[0]
        const categoryOptions = resolverOptions?.categories || []
        const brandOptions = resolverOptions?.brands || []
        const unitOptions = resolverOptions?.unitTypes || []
        const resolverHint =
          row.resolvers?.category?.status ||
          row.resolvers?.brand?.status ||
          row.resolvers?.unitType?.status ||
          'empty'
        const attributesWithValues = (row.resolvers?.attributes || []).filter(
          (attribute) => attribute.status !== 'empty',
        )

        return (
          <Fragment key={`import-row-${row.rowNumber || index}`}>
            <tr
              className={cn(
                'align-top',
                row.validationState === 'error' && 'bg-red-50/40 dark:bg-red-950/15',
                row.validationState === 'warning' && 'bg-amber-50/30 dark:bg-amber-950/10',
              )}
            >
              <td className="w-8">
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => toggleRow(row.rowNumber)}
                  aria-expanded={isExpanded}
                  aria-label={`Toggle row ${row.rowNumber} details`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </td>
              <td className="whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-slate-400">
                #{row.rowNumber ?? index + 2}
              </td>
              <td className="min-w-[14rem]">
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {row.productName || '—'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {row.productType || '—'} · {row.sku || '—'}
                </div>
              </td>
              <td className="min-w-[18rem]">
                <div className="space-y-1.5">
                  <StateBadge
                    value={row.validationState}
                    label={reviewLabelMap[row.validationState] || 'Needs review'}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatReviewMeta(row)}
                  </p>
                  {firstIssue ? (
                    <p
                      className={cn(
                        'line-clamp-2 text-[11px]',
                        firstIssue.severity === 'error'
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-amber-800 dark:text-amber-300',
                      )}
                    >
                      {firstIssue.field ? `${firstIssue.field}: ` : ''}
                      {firstIssue.message}
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      No blocking row issues detected.
                    </p>
                  )}
                </div>
              </td>
              <td className="min-w-[10rem]">
                <div className="space-y-1">
                  <StateBadge
                    value={row.duplicateState}
                    label={duplicateLabelMap[row.duplicateState] || 'Review'}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {row.nameDuplicate ? 'Possible name match found' : 'SKU-based duplicate review'}
                  </p>
                </div>
              </td>
              <td className="min-w-[11rem]">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <ResolverStatusIcon
                      status={row.resolverState === 'needs_mapping' ? 'unresolved' : resolverHint}
                    />
                    <StateBadge
                      value={row.resolverState}
                      label={resolverLabelMap[row.resolverState] || 'Resolved'}
                    />
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {unresolvedCatalog.length + unresolvedAttributes.length > 0
                      ? `${unresolvedCatalog.length + unresolvedAttributes.length} unresolved mapping items`
                      : 'All mapping checks complete'}
                  </p>
                </div>
              </td>
              <td className="min-w-[9rem]">
                <RowBadges badges={row.badges} />
              </td>
            </tr>
            {isExpanded ? (
              <tr
                key={`import-row-details-${row.rowNumber || index}`}
                className="bg-slate-50/70 dark:bg-slate-900/50"
              >
                <td colSpan={7} className="p-3">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="space-y-3">
                      <div className="rounded-lg border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Row health
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <StateBadge
                            value={row.validationState}
                            label={reviewLabelMap[row.validationState] || 'Needs review'}
                          />
                          <StateBadge
                            value={row.duplicateState}
                            label={duplicateLabelMap[row.duplicateState] || 'Review'}
                          />
                          <StateBadge
                            value={row.resolverState}
                            label={resolverLabelMap[row.resolverState] || 'Resolved'}
                          />
                        </div>
                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                          Status: {row.status || 'draft'} · SKU: {row.sku || '—'}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Validation details
                        </p>
                        {validationItems.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {validationItems.map((item) => (
                              <div
                                key={item.id}
                                className={cn(
                                  'rounded-lg border px-3 py-2 text-xs',
                                  severityToneMap[item.severity],
                                )}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold uppercase tracking-wide">
                                    {item.severity}
                                  </span>
                                  {item.field ? (
                                    <span className="rounded-full bg-white/70 px-2 py-0.5 font-medium dark:bg-slate-950/30">
                                      {item.field}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1.5 leading-relaxed">{item.message}</p>
                                {item.value ? (
                                  <p className="mt-1 text-[11px] opacity-80">
                                    Imported value: {item.value}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">No blocking errors or warnings.</p>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Imported values
                        </p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {renderDetailField('Name', row.normalizedData?.product_name, row.productName)}
                          {renderDetailField('SKU', row.normalizedData?.sku, row.sku)}
                          {renderDetailField('Type', row.normalizedData?.product_type, row.productType)}
                          {renderDetailField('Status', row.normalizedData?.status || 'draft', row.status || 'draft')}
                          {renderDetailField('Category', row.normalizedData?.category, row.resolvers?.category?.entityName)}
                          {renderDetailField('Brand', row.normalizedData?.brand, row.resolvers?.brand?.entityName)}
                          {renderDetailField('Unit type', row.normalizedData?.unit_type, row.resolvers?.unitType?.entityName)}
                          {renderDetailField('Price', row.normalizedData?.price)}
                          {renderDetailField('Sale price', row.normalizedData?.sale_price)}
                          {renderDetailField('Stock', row.normalizedData?.stock)}
                        </div>
                      </div>

                      {row.nameDuplicate ? (
                        <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
                          <div className="inline-flex items-center gap-2 font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Potential duplicate product name
                          </div>
                          <p className="mt-1.5 leading-relaxed">
                            The imported name looks similar to an existing product. Review it before
                            committing an update or create-only import.
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Catalog mapping
                        </p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {[
                            ['category', 'Category', categoryOptions],
                            ['brand', 'Brand', brandOptions],
                            ['unitType', 'Unit type', unitOptions],
                          ].map(([fieldKey, label, options]) => {
                            const resolver = row.resolvers?.[fieldKey]
                            return (
                              <div
                                key={fieldKey}
                                className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {label}
                                  </p>
                                  <StateBadge
                                    value={resolver?.status === 'unresolved' ? 'needs_mapping' : 'resolved'}
                                    label={
                                      resolver?.status === 'will_create'
                                        ? 'Auto-create'
                                        : resolver?.status === 'unresolved'
                                          ? 'Needs mapping'
                                          : 'Resolved'
                                    }
                                  />
                                </div>
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                  Imported: {displayOrDash(resolver?.input)}
                                </p>
                                {resolver?.status === 'unresolved'
                                  ? (
                                      <div className="mt-2">{renderResolverSelect(row, fieldKey, options)}</div>
                                    )
                                  : (
                                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {displayOrDash(resolver?.entityName || resolver?.input)}
                                      </p>
                                    )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Attribute mapping
                        </p>
                        <div className="mt-3 space-y-3">
                          {attributesWithValues.length > 0 ? (
                            attributesWithValues.map((attribute) =>
                              renderAttributeMappingControl(row, attribute),
                            )
                          ) : (
                            <p className="text-xs text-slate-500">
                              No attribute mapping action is required for this row.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ) : null}
          </Fragment>
        )
      }}
    />
  )
}

export default ProductImportPreviewTable
