import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import AdminSelect from '@/components/admin-ui/AdminSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  downloadProductImportErrorsCsv,
  previewProductImport,
  runProductImport,
} from '@/api/importApi'
import ProductImportStepper from '@/components/product-import/ProductImportStepper'
import ProductImportPreviewTable from '@/components/product-import/ProductImportPreviewTable'
import ProductImportHistory from '@/components/product-import/ProductImportHistory'
import ProductImportSummaryStats from '@/components/product-import/ProductImportSummaryStats'
import ProductImportMappingPanel from '@/components/product-import/ProductImportMappingPanel'
import { cn } from '@/lib/utils'

const STRATEGY_OPTIONS = [
  { value: 'skip_duplicates', label: 'Skip duplicates' },
  { value: 'update_existing', label: 'Update existing (SKU)' },
  { value: 'create_only', label: 'Create only new' },
]

const STEP_COPY = {
  1: {
    eyebrow: 'Step 1',
    title: 'Upload template',
    description: 'Choose the canonical CSV or XLSX sample and prepare the import run.',
  },
  2: {
    eyebrow: 'Step 2',
    title: 'Review preview',
    description: 'Inspect row health, duplicates, and unresolved catalog mappings before commit.',
  },
  3: {
    eyebrow: 'Step 3',
    title: 'Confirm import',
    description: 'Run the import only after the preview is clear and duplicate strategy is correct.',
  },
}

const getDuplicateSnapshot = (duplicateSummary) => [
  { label: 'New', value: duplicateSummary?.newProducts ?? 0 },
  { label: 'Updates', value: duplicateSummary?.updates ?? 0 },
  { label: 'Skipped', value: duplicateSummary?.skippedDuplicates ?? 0 },
  { label: 'Needs mapping', value: duplicateSummary?.unresolvedRows ?? 0 },
]

function ProductImportWizard({
  onImportComplete,
  onDownloadCsv,
  onDownloadXlsx,
  downloadLoading = { csv: false, xlsx: false },
}) {
  const [step, setStep] = useState(1)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewResult, setPreviewResult] = useState(null)
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip_duplicates')
  const [checkNameDuplicates, setCheckNameDuplicates] = useState(false)
  const [autoCreateCatalog, setAutoCreateCatalog] = useState(true)
  const [rowMappings, setRowMappings] = useState({})
  const [importSummary, setImportSummary] = useState(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
    setSelectedFileName(file?.name || '')
    setPreviewError('')
    setPreviewResult(null)
    setImportSummary(null)
    setRowMappings({})
    setStep(1)
  }

  const runPreview = useCallback(async () => {
    if (!selectedFile) {
      setPreviewError('Select a CSV or XLSX file first.')
      return null
    }

    setPreviewLoading(true)
    setPreviewError('')

    try {
      const response = await previewProductImport(selectedFile, {
        duplicateStrategy,
        rowMappings,
        checkNameDuplicates,
        autoCreateCatalog,
      })
      const payload = response?.data?.data || response?.data || null
      setPreviewResult(payload)
      return payload
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to parse import file.'
      setPreviewError(message)
      return null
    } finally {
      setPreviewLoading(false)
    }
  }, [selectedFile, duplicateStrategy, rowMappings, checkNameDuplicates, autoCreateCatalog])

  const handleRowMappingChange = (rowNumber, fieldKey, mapping) => {
    setRowMappings((current) => {
      const next = { ...current }
      const row = { ...(next[rowNumber] || {}) }
      if (!mapping) {
        delete row[fieldKey]
      } else {
        row[fieldKey] = mapping
      }
      if (Object.keys(row).length === 0) {
        delete next[rowNumber]
      } else {
        next[rowNumber] = row
      }
      return next
    })
  }

  const handleAttributeMappingChange = (rowNumber, slot, mapping) => {
    setRowMappings((current) => {
      const next = { ...current }
      const row = { ...(next[rowNumber] || {}) }
      const existing = Array.isArray(row.attributes) ? [...row.attributes] : []
      const filtered = existing.filter((item) => Number(item.slot) !== Number(slot))

      if (mapping) {
        filtered.push({
          slot,
          ...mapping,
        })
      }

      if (filtered.length > 0) {
        row.attributes = filtered
      } else {
        delete row.attributes
      }

      if (Object.keys(row).length > 0) {
        next[rowNumber] = row
      } else {
        delete next[rowNumber]
      }

      return next
    })
  }

  const readyToImport = useMemo(() => {
    if (!previewResult?.rows?.length) return false
    const blockingRows = previewResult.rows.filter((row) => {
      if (row.validationState === 'error') return true
      if (row.resolverState === 'needs_mapping') return true
      if (row.duplicateState === 'duplicate' && duplicateStrategy === 'skip_duplicates') {
        return row.productType === 'simple' || row.productType === 'variable'
      }
      return false
    })
    return blockingRows.length === 0
  }, [previewResult, duplicateStrategy])

  const duplicateChips = previewResult?.duplicateSummary
  const currentStep = STEP_COPY[step]
  const controlsDisabled = previewLoading || importLoading
  const duplicateSnapshot = getDuplicateSnapshot(duplicateChips)
  const previewRows = previewResult?.rows || []
  const previewIssueCount = previewRows.reduce(
    (total, row) => total + (row.errors?.length || 0) + (row.warnings?.length || 0),
    0,
  )
  const hasPreview = step >= 2 && previewResult
  const hasBlockingRows = hasPreview && !readyToImport
  const handleRunImport = async () => {
    if (!selectedFile) return

    setImportLoading(true)
    setPreviewError('')

    try {
      const response = await runProductImport(selectedFile, {
        strategy: duplicateStrategy,
        rowMappings,
        checkNameDuplicates,
        autoCreateCatalog,
      })
      const payload = response?.data?.data || response?.data || null
      setImportSummary(payload)
      setSummaryOpen(true)
      setHistoryRefreshKey((current) => current + 1)
      onImportComplete?.(payload)
    } catch (err) {
      setPreviewError(
        err?.response?.data?.message || err?.message || 'Product import failed.',
      )
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div className="product-import-wizard space-y-5">
      {previewError ? (
        <AdminAlert type="error" title="Import error">
          {previewError}
        </AdminAlert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <ModuleCard
            title="Import workflow"
            description="Move through upload, preview, and commit with a stable preview-before-write flow."
          >
            <div className="space-y-3">
              <ProductImportStepper currentStep={step} />
              <div className="grid gap-3 md:grid-cols-3">
                {Object.entries(STEP_COPY).map(([id, config]) => {
                  const numericId = Number(id)
                  const isActive = step === numericId
                  const isComplete = step > numericId

                  return (
                    <div
                      key={id}
                      className={cn(
                        'rounded-xl border px-3 py-3 transition-colors',
                        isActive &&
                          'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950',
                        isComplete &&
                          'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100',
                        !isActive &&
                          !isComplete &&
                          'border-slate-200 bg-slate-50/70 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300',
                      )}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">
                        {config.eyebrow}
                      </p>
                      <p className="mt-2 text-sm font-semibold">{config.title}</p>
                      <p
                        className={cn(
                          'mt-1 text-xs leading-relaxed',
                          isActive
                            ? 'text-white/80 dark:text-slate-700'
                            : 'text-slate-500 dark:text-slate-400',
                        )}
                      >
                        {config.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </ModuleCard>

          <ModuleCard
            title={currentStep.title}
            description={currentStep.description}
            actions={
              hasPreview ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={previewLoading}
                  onClick={runPreview}
                >
                  {previewLoading ? 'Refreshing…' : 'Refresh preview'}
                </Button>
              ) : null
            }
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-slate-300/90 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <Upload className="h-3.5 w-3.5" />
                      Import file
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      Upload the filled template for validation and preview.
                    </p>
                    <p className="max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      CSV is the quickest path for operator imports. XLSX supports the same
                      canonical headers and keeps instructions beside the data sheet.
                    </p>
                  </div>
                  {selectedFileName ? (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Current file
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {selectedFileName}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xlsm,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="max-w-xl bg-white dark:bg-slate-950"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Accepted formats: `.csv`, `.xlsx`, `.xlsm`, `.xls`
                  </p>
                </div>
              </div>

              {hasPreview ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800/90 dark:bg-slate-950/40">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Preview snapshot
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {selectedFileName} · schema {previewResult.schemaVersion || 'v1'}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                      <p>{previewResult.totalRows ?? 0} parsed rows</p>
                      <p>{previewIssueCount} review items surfaced in preview</p>
                    </div>
                  </div>
                  <AdminAlert
                    type={readyToImport ? 'info' : 'warning'}
                    title={readyToImport ? 'Preview ready' : 'Preview needs attention'}
                  >
                    {readyToImport
                      ? 'Detailed preview review now spans the full workspace below so operators can inspect mappings and row-level outcomes without the side rail crowding the table.'
                      : 'Detailed row validation and mapping actions are shown below. Resolve blocking rows there before running the import.'}
                  </AdminAlert>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-5 text-sm text-slate-600 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-300">
                  Upload a file to generate the preview. No products are created during validation.
                </div>
              )}
            </div>
          </ModuleCard>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <ModuleCard
            title="Import settings"
            description="These controls affect both preview analysis and the final import run."
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Duplicate strategy
                </label>
                <AdminSelect
                  value={duplicateStrategy}
                  onChange={(event) => setDuplicateStrategy(event.target.value)}
                  disabled={controlsDisabled}
                >
                  {STRATEGY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <Checkbox
                    checked={autoCreateCatalog}
                    onCheckedChange={(value) => setAutoCreateCatalog(Boolean(value))}
                    disabled={controlsDisabled}
                  />
                  <span>
                    <span className="font-medium">Auto-create missing catalog values</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      Creates missing categories, brands, unit types, and attribute values during
                      import when possible.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <Checkbox
                    checked={checkNameDuplicates}
                    onCheckedChange={(value) => setCheckNameDuplicates(Boolean(value))}
                    disabled={controlsDisabled}
                  />
                  <span>
                    <span className="font-medium">Check duplicate product names</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      Adds preview warnings when another product already exists with the same name.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </ModuleCard>

          <ModuleCard
            title="Templates"
            description="Download the official samples before preparing a new import batch."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={downloadLoading.csv}
                  onClick={onDownloadCsv}
                >
                  {downloadLoading.csv ? 'Downloading…' : 'Sample CSV'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={downloadLoading.xlsx}
                  onClick={onDownloadXlsx}
                >
                  {downloadLoading.xlsx ? 'Downloading…' : 'Sample XLSX'}
                </Button>
              </div>
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                <div className="inline-flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                  <FileSpreadsheet className="h-4 w-4" />
                  Template guidance
                </div>
                <p className="mt-2">
                  CSV and XLSX use the same canonical headers. XLSX also includes operator-friendly
                  instructions and field reference sheets beside the importable `Products` sheet.
                </p>
              </div>
            </div>
          </ModuleCard>

          <ModuleCard
            title="Run status"
            description="Track whether the current file is ready to move forward."
          >
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Current step
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {currentStep.title}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {selectedFileName ? selectedFileName : 'No file selected yet.'}
                </p>
              </div>

              {hasPreview ? (
                <div
                  className={cn(
                    'rounded-lg border px-3 py-3 text-sm',
                    hasBlockingRows
                      ? 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100'
                      : 'border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100',
                  )}
                >
                  <div className="inline-flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    {hasBlockingRows ? 'Action required before import' : 'Preview is ready for import'}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed opacity-80">
                    {hasBlockingRows
                      ? 'Stay in the preview until validation errors and unresolved mappings are cleared.'
                      : 'The current preview does not contain blocking rows for the selected duplicate strategy.'}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  A preview snapshot will appear here after the first validation run.
                </div>
              )}
            </div>
          </ModuleCard>
        </aside>
      </div>

      {hasPreview ? (
        <div className="space-y-4">
          <ModuleCard
            title="Preview summary"
            description="Review import health, duplicate impact, and mapping blockers before commit."
            compact
          >
            <div className="space-y-4">
              <ProductImportSummaryStats previewResult={previewResult} />

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {duplicateSnapshot.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800/90 dark:bg-slate-900/60"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <ProductImportMappingPanel rows={previewRows} autoCreateCatalog={autoCreateCatalog} />
            </div>
          </ModuleCard>

          <ModuleCard
            title="Preview rows"
            description="Use row details to resolve errors, review duplicates, and verify the final values that will be committed."
            compact
          >
            <ProductImportPreviewTable
              rows={previewRows}
              resolverOptions={previewResult.resolverOptions}
              rowMappings={rowMappings}
              onRowMappingChange={handleRowMappingChange}
              onAttributeMappingChange={handleAttributeMappingChange}
            />
          </ModuleCard>

          {step === 3 ? (
            <AdminAlert type={readyToImport ? 'info' : 'warning'} title="Ready to import">
              {readyToImport
                ? 'Import will create or update products row-by-row. Failed rows are preserved in the audit trail and can be exported after the run.'
                : 'Resolve blocking validation or mapping issues before running the import. Preview rows marked with errors or unresolved mappings will not commit safely.'}
            </AdminAlert>
          ) : null}
        </div>
      ) : null}

      <footer className="product-import-footer">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {step === 1 && 'Step 1 of 3 — upload a filled template and validate the file.'}
          {step === 2 && 'Step 2 of 3 — review row health, duplicates, and unresolved mappings.'}
          {step === 3 && 'Step 3 of 3 — confirm the batch and run the import.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {step > 1 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={controlsDisabled}
              onClick={() => setStep((value) => Math.max(1, value - 1))}
            >
              Back
            </Button>
          ) : null}
          {step === 1 ? (
            <Button
              type="button"
              size="sm"
              disabled={!selectedFile || previewLoading}
              onClick={async () => {
                const payload = await runPreview()
                if (payload) setStep(2)
              }}
            >
              {previewLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validating…
                </>
              ) : (
                'Validate & continue'
              )}
            </Button>
          ) : null}
          {step === 2 ? (
            <Button
              type="button"
              size="sm"
              disabled={previewLoading || !previewResult}
              onClick={async () => {
                const payload = await runPreview()
                if (payload) setStep(3)
              }}
            >
              Review & confirm
            </Button>
          ) : null}
          {step === 3 ? (
            <Button
              type="button"
              size="sm"
              className={cn(!readyToImport && 'opacity-60')}
              disabled={!readyToImport || importLoading}
              onClick={handleRunImport}
            >
              {importLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                'Run import'
              )}
            </Button>
          ) : null}
        </div>
      </footer>

      <div id="product-import-history">
        <ProductImportHistory refreshKey={historyRefreshKey} />
      </div>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import summary</DialogTitle>
            <DialogDescription>
              Status: {importSummary?.status || 'completed'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200/80 p-2 dark:border-slate-800">
              <p className="text-xs text-slate-500">Imported</p>
              <p className="text-lg font-semibold">{importSummary?.importedCount ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200/80 p-2 dark:border-slate-800">
              <p className="text-xs text-slate-500">Updated</p>
              <p className="text-lg font-semibold">{importSummary?.updatedCount ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200/80 p-2 dark:border-slate-800">
              <p className="text-xs text-slate-500">Skipped</p>
              <p className="text-lg font-semibold">{importSummary?.skippedCount ?? 0}</p>
            </div>
            <div className="rounded-lg border border-red-200/80 p-2 dark:border-red-900/50">
              <p className="text-xs text-red-600 dark:text-red-400">Failed</p>
              <p className="text-lg font-semibold text-red-700 dark:text-red-300">
                {importSummary?.failedCount ?? 0}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {importSummary?.failedCount > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  downloadProductImportErrorsCsv({ failedRows: importSummary.failedRows })
                }
              >
                Download errors CSV
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setSummaryOpen(false)
                document.getElementById('product-import-history')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }}
            >
              View import history
            </Button>
            <Button asChild type="button" variant="outline" size="sm">
              <Link to="/products">View products</Link>
            </Button>
            <Button type="button" size="sm" onClick={() => setSummaryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductImportWizard
