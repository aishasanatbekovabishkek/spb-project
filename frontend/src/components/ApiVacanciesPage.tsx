import { useEffect, useState, type FormEvent } from 'react'
import {
  Search,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  BriefcaseBusiness,
} from 'lucide-react'

import {
  searchVacancies,
  type Vacancy,
} from '../services/vacancies'
import { ApiError } from '../services/api'

export default function ApiVacanciesPage() {
  const [input, setInput] = useState('Python')
  const [query, setQuery] = useState('Python')

  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isStale, setIsStale] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadVacancies() {
      setLoading(true)
      setError(null)

      try {
        const result = await searchVacancies(
          query,
          page,
          20,
          controller.signal,
        )

        if (controller.signal.aborted) return

        setVacancies(result.items)
        setTotal(result.total)
        setIsStale(result.is_stale)
      } catch (err) {
        if (controller.signal.aborted) return

        setVacancies([])
        setTotal(0)
        setIsStale(false)

        if (err instanceof ApiError) {
          if (err.status === 404) {
            setError(
              'Поиск через API пока недоступен. ' +
              'Возможно, backend ещё не реализован.',
            )
          } else if (err.status === 503) {
            setError(
              'Сервис вакансий временно недоступен. ' +
              'Попробуйте повторить запрос позже.',
            )
          } else {
            setError(err.message)
          }
        } else {
          setError('Не удалось загрузить вакансии.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadVacancies()

    return () => controller.abort()
  }, [query, page])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextQuery = input.trim()

    if (!nextQuery) {
      setError('Введите название вакансии.')
      return
    }

    setQuery(nextQuery)
    setPage(1)
  }

  return (
    <section className="api-vacancies">
      <form
        className="api-search-form"
        onSubmit={submitSearch}
      >
        <div className="search-panel">
          <Search size={21} />

          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Например, Python Developer"
            aria-label="Поисковый запрос"
          />
        </div>

        <button
          className="action-button"
          type="submit"
          disabled={loading}
        >
          Найти
        </button>
      </form>

      {isStale && !loading && (
        <div className="api-notice" role="status">
          <AlertTriangle size={18} />
          Показаны сохранённые результаты.
          Информация может быть устаревшей.
        </div>
      )}

      {error && (
        <div className="api-error" role="alert">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="section-heading">
        <h2>Результаты поиска</h2>

        <span className="results-count">
          {loading ? 'Загрузка...' : `Всего: ${total}`}
        </span>
      </div>

      {loading ? (
        <div className="api-empty" role="status">
          <RefreshCw size={28} className="api-spinner" />
          <p>Загружаем вакансии...</p>
        </div>
      ) : vacancies.length === 0 && !error ? (
        <div className="api-empty">
          <Search size={30} />
          <h3>Вакансии не найдены</h3>
          <p>Попробуйте изменить запрос.</p>
        </div>
      ) : (
        <div className="vacancy-grid">
          {vacancies.map((vacancy) => (
            <article
              className="vacancy-card"
              key={`${vacancy.source}:${vacancy.external_id}`}
            >
              <div className="card-heading">
                <div className="company-logo">
                  <BriefcaseBusiness size={20} />
                </div>
              </div>

              <h3>{vacancy.title}</h3>

              <p className="company-name">
                {vacancy.company ?? 'Компания не указана'}
              </p>

              <div className="vacancy-details">
                <span>
                  Источник: {vacancy.source}
                </span>
              </div>

              {vacancy.url ? (
                <a
                  className="action-button api-vacancy-link"
                  href={vacancy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Открыть вакансию
                  <ExternalLink size={15} />
                </a>
              ) : (
                <span className="api-no-link">
                  Ссылка на вакансию отсутствует
                </span>
              )}
            </article>
          ))}
        </div>
      )}

      {!loading && !error && total > 20 && (
        <div className="api-pagination">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Назад
          </button>

          <span>Страница {page}</span>

          <button
            type="button"
            disabled={page * 20 >= total}
            onClick={() => setPage((current) => current + 1)}
          >
            Далее
          </button>
        </div>
      )}
    </section>
  )
}
