import { useState } from 'react'
import { Link } from 'react-router-dom'
import { downloadProductImportTemplateCsv, downloadProductImportTemplateXlsx } from '@/api/importApi'
import AdminAlert from '@/components/admin-ui/AdminAlert'
import AdminPage from '@/components/admin-ui/AdminPage'
import ProductImportWizard from '@/components/product-import/ProductImportWizard'
import { Button } from '@/components/ui/button'

function ProductImports() {
  const [downloadLoading, setDownloadLoading] = useState({
    csv: false,
    xlsx: false,
  })
  const [importMessage, setImportMessage] = useState('')
  const [importMessageType, setImportMessageType] = useState('info')

  const handleTemplateDownload = async (format) => {
    const key = format === 'csv' ? 'csv' : 'xlsx'

    setDownloadLoading((current) => ({
      ...current,
      [key]: true,
    }))
    setImportMessage('')

    try {
      if (format === 'csv') {
        await downloadProductImportTemplateCsv()
      } else {
        await downloadProductImportTemplateXlsx()
      }

      setImportMessageType('info')
      setImportMessage(
        format === 'csv'
          ? 'Sample CSV downloaded. Use it when you need the fastest path to preview and import.'
          : 'Sample XLSX downloaded with the Products, Instructions, and Field Reference sheets.',
      )
    } catch (error) {
      setImportMessageType('error')
      setImportMessage(error?.message || 'Template download failed.')
    } finally {
      setDownloadLoading((current) => ({
        ...current,
        [key]: false,
      }))
    }
  }

  return (
    <AdminPage
      headerMode="compact"
      title="Product Imports"
      description="Validate CSV or XLSX templates, resolve catalog mappings, run auditable imports, and review recent import history."
      actions={
        <Link to="/products">
          <Button size="sm" variant="outline">
            View Products
          </Button>
        </Link>
      }
    >
      {importMessage ? (
        <AdminAlert
          type={importMessageType === 'error' ? 'error' : 'info'}
          title={importMessageType === 'error' ? 'Template download failed' : 'Template ready'}
        >
          {importMessage}
        </AdminAlert>
      ) : null}

      <ProductImportWizard
        onDownloadCsv={() => handleTemplateDownload('csv')}
        onDownloadXlsx={() => handleTemplateDownload('xlsx')}
        downloadLoading={downloadLoading}
      />
    </AdminPage>
  )
}

export default ProductImports
