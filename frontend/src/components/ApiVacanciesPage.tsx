
import { useEffect, useState, type FormEvent } from 'react'
import {
  Search,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  BriefcaseBusiness,
  Bookmark,
  Send,
} from 'lucide-react'

import {
  searchVacancies,
  type Vacancy,
} from '../services/vacancies'
import { saveVacancy } from '../services/savedVacancies'
import { createApplication } from '../services/applications'
import { ApiError } from '../services/api'

const PER_PAGE = 20

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Сначала войдите в аккаунт.'
    }

    if (error.status === 409) {
      return 'Эта вакансия уже добавлена.'
    }

    return error.message
  }

  return 'Не удалось выполнить действие.'
}

export default function ApiVacanciesPage() {
  const [input, setInput] = useState('Python')
  const [query, setQuery] = useState('Python')
  const [page, setPage] = useState(1)

  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [total, setTotal] = useState(0)
  const [isStale, setIsStale] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const [savedKeys, setSavedKeys] = useState<string[]>([])
  const [appliedKeys, setAppliedKeys] = useState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      setNotice(null)
      setVacancies([])
      setTotal(0)
      setIsStale(false)

      try {
        const result = await searchVacancies(
          query,
          page,
          PER_PAGE,
          controller.signal,
        )

        if (controller.signal.aborted) return

        setVacancies(result.items)
        setTotal(result.total)
        setIsStale(result.is_stale)
      } catch (err) {
        if (controller.signal.aborted) return

        if (err instanceof ApiError && err.status === 404) {
          setError(
            'Маршрут поиска вакансий ещё не реализован на сервере.',
          )
        } else if (
          err instanceof ApiError &&
          err.status === 503
        ) {
          setError(
            'Сервис вакансий временно недоступен.',
          )
        } else {
          setError(getErrorMessage(err))
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [query, page])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const value = input.trim()

    if (!value) {
      setError('Введите поисковый запрос.')
      return
    }

    setError(null)

    if (value === query && page === 1) {
      setQuery('')
      queueMicrotask(() => setQuery(value))
    } else {
      setQuery(value)
      setPage(1)
    }
  }

  function vacancyKey(vacancy: Vacancy): string {
    return `${vacancy.source}:${vacancy.external_id}`
  }

  async function handleSave(vacancy: Vacancy) {
    const key = vacancyKey(vacancy)

    setBusyKey(key)
    setNotice(null)
    setError(null)

    try {
      await saveVacancy({
        source: vacancy.source,
        external_id: vacancy.external_id,
      })

      setSavedKeys((current) =>
        current.includes(key) ? current : [...current, key],
      )

      setNotice(`Вакансия «${vacancy.title}» сохранена.`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyKey(null)
    }
  }

  async function handleApply(vacancy: Vacancy) {
    const key = vacancyKey(vacancy)

    setBusyKey(key)
    setNotice(null)
    setError(null)

    try {
      await createApplication({
        source: vacancy.source,
        external_id: vacancy.external_id,
      })

      setAppliedKeys((current) =>
        current.includes(key) ? current : [...current, key],
      )

      setNotice(
        `Отклик на «${vacancy.title}» добавлен в трекер.`,
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyKey(null)
    }
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
            aria-label="Поиск вакансий"
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
          Результаты получены из резервного кэша и могут
          быть устаревшими.
        </div>
      )}

      {notice && (
        <div className="api-success" role="status">
          {notice}
        </div>
      )}

      {error && (
        <div className="api-error" role="alert">
          <AlertTriangle size={18} />
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
          {vacancies.map((vacancy) => {
            const key = vacancyKey(vacancy)
            const busy = busyKey === key

            const saved = savedKeys.includes(key)
            const applied = appliedKeys.includes(key)

            return (
              <article
                className="vacancy-card"
                key={key}
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
                  <span>Источник: {vacancy.source}</span>
                </div>

                <div className="api-card-actions">
                  <button
                    type="button"
                    className="api-small-button"
                    disabled={busy || saved || busyKey !== null}
                    onClick={() => void handleSave(vacancy)}
                  >
                    <Bookmark size={16} />
                    {saved ? 'Сохранено' : 'Сохранить'}
                  </button>

                  <button
                    type="button"
                    className="api-small-button api-primary-button"
                    disabled={busy || applied || busyKey !== null}
                    onClick={() => void handleApply(vacancy)}
                  >
                    <Send size={16} />
                    {applied ? 'Отклик добавлен' : 'Добавить отклик'}
                  </button>
                </div>

                {vacancy.url && (
                  <a
                    className="api-external-link"
                    href={vacancy.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Открыть на сайте работодателя
                    <ExternalLink size={15} />
                  </a>
                )}
              </article>
            )
          })}
        </div>
      )}

      {!loading && !error && total > PER_PAGE && (
        <div className="api-pagination">
          <button
            type="button"
            disabled={page === 1}
            onClick={() =>
              setPage((current) => Math.max(1, current - 1))
            }
          >
            Назад
          </button>

          <span>
            Страница {page} из {Math.ceil(total / PER_PAGE)}
          </span>

          <button
            type="button"
            disabled={page * PER_PAGE >= total}
            onClick={() => setPage((current) => current + 1)}
          >
            Далее
          </button>
        </div>
      )}
    </section>
  )
}
