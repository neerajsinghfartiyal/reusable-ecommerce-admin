import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { deletePage, getPages } from '../api/pageApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ModuleActions from '@/components/admin-ui/ModuleActions'
import ModuleCard from '@/components/admin-ui/ModuleCard'
import ModuleEmptyState from '@/components/admin-ui/ModuleEmptyState'
import ModuleHeader from '@/components/admin-ui/ModuleHeader'
import ModuleStatusBadge from '@/components/admin-ui/ModuleStatusBadge'
import ModuleTable from '@/components/admin-ui/ModuleTable'
import ModuleToolbar from '@/components/admin-ui/ModuleToolbar'
import Pagination from '../components/ui/Pagination'

const pageTypeFilters = ['all', 'page', 'homepage', 'landing', 'policy', 'blog', 'custom']
const statusFilters = ['all', 'draft', 'published']

const getNumberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

const extractList = (response) => {
  const checks = [
    response?.data?.pages,
    response?.pages,
    response?.data?.data?.pages,
    response?.data?.items,
    response?.items,
    response?.data,
    response,
  ]
  for (const value of checks) {
    if (Array.isArray(value)) return value
  }
  return []
}

const extractPagination = (response) =>
  response?.data?.data?.pagination ||
  response?.data?.pagination ||
  response?.pagination ||
  {}

const getTextValue = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return '-'
}

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '-')

function Pages() {
  const location = useLocation()
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [pageTypeFilter, setPageTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState('')
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
    pageLimit: 10,
  })

  const loadPages = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage }
      if (searchQuery) params.search = searchQuery
      if (pageTypeFilter !== 'all') params.pageType = pageTypeFilter
      if (statusFilter !== 'all') params.status = statusFilter

      const response = await getPages(params)
      const list = extractList(response)
      const paginationData = extractPagination(response)

      setPages(list)
      setPagination({
        totalItems: getNumberValue(
          paginationData?.totalItems,
          paginationData?.totalPagesCount,
          response?.data?.data?.totalItems,
          response?.data?.totalItems,
          list.length,
        ),
        currentPage: Math.max(
          1,
          getNumberValue(
            paginationData?.currentPage,
            response?.data?.data?.currentPage,
            response?.data?.currentPage,
            currentPage,
          ),
        ),
        totalPages: Math.max(
          1,
          getNumberValue(
            paginationData?.totalPages,
            response?.data?.data?.totalPages,
            response?.data?.totalPages,
            1,
          ),
        ),
        pageLimit: getNumberValue(
          paginationData?.pageLimit,
          paginationData?.limit,
          response?.data?.data?.pageLimit,
          response?.data?.pageLimit,
          10,
        ),
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load pages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPages()
  }, [currentPage, searchQuery, pageTypeFilter, statusFilter, location.pathname])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleDelete = async (page) => {
    const pageId = page?._id || page?.id
    if (!pageId) return

    const pageName = page?.title || page?.slug || 'this page'
    const confirmed = window.confirm(`Are you sure you want to delete ${pageName}?`)
    if (!confirmed) return

    setDeletingId(pageId)
    setError('')
    try {
      await deletePage(pageId)
      await loadPages()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete page.')
    } finally {
      setDeletingId('')
    }
  }

  const goPrev = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goNext = () => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    { key: 'pageType', label: 'Page Type' },
    { key: 'status', label: 'Status' },
    { key: 'seoTitle', label: 'SEO Title' },
    { key: 'updatedAt', label: 'Updated At' },
    { key: 'actions', label: 'Actions' },
  ]

  return (
    <section>
      <ModuleHeader
        title="CMS Pages"
        description="Manage static pages, SEO content, and reusable page sections."
        actions={
          <Link to="/pages/create">
            <Button size="sm">Create Page</Button>
          </Link>
        }
      />

      <ModuleCard>
        <ModuleToolbar>
          <form className="flex w-full flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSearchSubmit}>
            <Input
              type="text"
              placeholder="Search pages..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>

          <select
            className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={pageTypeFilter}
            onChange={(event) => {
              setCurrentPage(1)
              setPageTypeFilter(event.target.value)
            }}
          >
            {pageTypeFilters.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(event) => {
              setCurrentPage(1)
              setStatusFilter(event.target.value)
            }}
          >
            {statusFilters.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </ModuleToolbar>

        {loading ? (
          <ModuleCard>
            <p className="text-sm text-slate-600">Loading pages...</p>
          </ModuleCard>
        ) : null}

        {error ? (
          <ModuleCard className="border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
          </ModuleCard>
        ) : null}

        {!loading && !error ? (
          pages.length === 0 ? (
            <ModuleEmptyState
              title="No pages found"
              description="Try changing filters or create your first CMS page."
              action={
                <Link to="/pages/create">
                  <Button size="sm">Create Page</Button>
                </Link>
              }
            />
          ) : (
            <>
              <ModuleTable
                columns={columns}
                data={pages}
                emptyMessage="No pages found."
                renderRow={(page, index) => {
                  const id = page?._id || page?.id || `page-${index}`
                  const pageStatus = String(page?.status || 'draft').toLowerCase()
                  const pageType = getTextValue(page?.pageType, 'page')

                  return (
                    <tr key={id}>
                      <td>{getTextValue(page?.title, 'Untitled')}</td>
                      <td>{getTextValue(page?.slug)}</td>
                      <td>{pageType}</td>
                      <td>
                        <ModuleStatusBadge status={pageStatus} />
                      </td>
                      <td>{getTextValue(page?.seoTitle)}</td>
                      <td>{formatDate(page?.updatedAt)}</td>
                      <td>
                        <ModuleActions>
                          <Link to={`/pages/edit/${page?._id || page?.id}`}>
                            <Button size="sm" variant="ghost" disabled={!page?._id && !page?.id}>
                              Edit
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deletingId === (page?._id || page?.id)}
                            onClick={() => handleDelete(page)}
                          >
                            {deletingId === (page?._id || page?.id) ? 'Deleting...' : 'Delete'}
                          </Button>
                        </ModuleActions>
                      </td>
                    </tr>
                  )
                }}
              />

              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPrevious={goPrev}
                onNext={goNext}
              />
            </>
          )
        ) : null}
      </ModuleCard>
    </section>
  )
}

export default Pages
