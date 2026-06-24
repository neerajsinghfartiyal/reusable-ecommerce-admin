import axiosClient from './axiosClient'

const parseBlobErrorMessage = async (error) => {
  const data = error?.response?.data
  if (!(data instanceof Blob)) {
    return error?.response?.data?.message || error?.message
  }

  try {
    const text = await data.text()
    const parsed = JSON.parse(text)
    return parsed?.message || text
  } catch {
    return error?.message || 'Download failed.'
  }
}

const downloadBlob = (response, fallbackFilename) => {
  const disposition = response?.headers?.['content-disposition'] || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  const filename = match?.[1] || fallbackFilename

  const blob = new Blob([response.data], {
    type: response.headers?.['content-type'] || 'application/octet-stream',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

const unwrapData = (response) => response?.data?.data ?? response?.data ?? null

export const downloadProductImportTemplateCsv = async () => {
  try {
    const response = await axiosClient.get('/api/products/import/template/csv', {
      responseType: 'blob',
    })
    downloadBlob(response, 'product-import-template.csv')
    return response
  } catch (error) {
    const message = await parseBlobErrorMessage(error)
    throw new Error(message || 'Failed to download CSV template.', { cause: error })
  }
}

export const downloadProductImportTemplateXlsx = async () => {
  try {
    const response = await axiosClient.get('/api/products/import/template/xlsx', {
      responseType: 'blob',
    })
    downloadBlob(response, 'product-import-template.xlsx')
    return response
  } catch (error) {
    const message = await parseBlobErrorMessage(error)
    throw new Error(message || 'Failed to download XLSX template.', { cause: error })
  }
}

export const previewProductImport = (file, options = {}) => {
  const formData = new FormData()
  formData.append('file', file)
  if (options.duplicateStrategy) {
    formData.append('duplicateStrategy', options.duplicateStrategy)
  }
  if (options.rowMappings) {
    formData.append('rowMappings', JSON.stringify(options.rowMappings))
  }
  if (options.checkNameDuplicates) {
    formData.append('checkNameDuplicates', 'true')
  }
  if (options.autoCreateCatalog === false) {
    formData.append('autoCreateCatalog', 'false')
  }

  return axiosClient.post('/api/products/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const runProductImport = (file, options = {}) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('strategy', options.strategy || 'skip_duplicates')
  if (options.rowMappings) {
    formData.append('rowMappings', JSON.stringify(options.rowMappings))
  }
  if (options.checkNameDuplicates) {
    formData.append('checkNameDuplicates', 'true')
  }
  if (options.autoCreateCatalog === false) {
    formData.append('autoCreateCatalog', 'false')
  }

  return axiosClient.post('/api/products/import/run', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getProductImportHistory = async (params = {}) => {
  const response = await axiosClient.get('/api/products/import/history', { params })
  return unwrapData(response)
}

export const downloadProductImportErrorsCsv = async ({ failedRows, historyId } = {}) => {
  try {
    if (historyId) {
      const response = await axiosClient.get(
        `/api/products/import/history/${historyId}/errors-csv`,
        { responseType: 'blob' },
      )
      downloadBlob(response, 'product-import-errors.csv')
      return response
    }

    const response = await axiosClient.post('/api/products/import/errors-csv', { failedRows }, {
      responseType: 'blob',
    })
    downloadBlob(response, 'product-import-errors.csv')
    return response
  } catch (error) {
    const message = await parseBlobErrorMessage(error)
    throw new Error(message || 'Failed to download error report.', { cause: error })
  }
}
