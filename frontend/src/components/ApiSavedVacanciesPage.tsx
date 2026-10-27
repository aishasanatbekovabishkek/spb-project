import { useCallback, useEffect, useState } from 'react'
import {
  Bookmark,
  ExternalLink,
  RefreshCw,
  Trash2,
} from 'lucide-react'

import {
  getSavedVacancies,
  deleteSavedVacancy,
  type SavedVacancy,
} from '../services/savedVacancies'
import { ApiError } from '../services/api'

export default function ApiSavedVacanciesPage() {
  const [items, setItems] = useState<SavedVacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadSaved = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getSavedVacancies()
      setItems(result.items)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Не удалось загрузить сохранённые вакансии.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSaved()
  }, [loadSaved])

  async function handleDelete(id: string) {
    setDeletingId(id)
    setError(null)

    try {
      await deleteSavedVacancy(id)
      setItems((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Не удалось удалить вакансию.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section>
      <div className="section-heading">
        <h2>Сохранённые вакансии</h2>

        <button
          type="button"
          className="text-button"
          onClick={() => void loadSaved()}
          disabled={loading}
        >
          <RefreshCw size={15} />
          Обновить
        </button>
      </div>

      {error && (
        <div className="api-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="api-empty" role="status">
          Загружаем сохранённые вакансии...
        </div>
      ) : items.length === 0 && !error ? (
        <div className="empty-state">
          <Bookmark size={36} />
          <h3>Пока ничего не сохранено</h3>
          <p>Сохранённые вакансии появятся здесь.</p>
        </div>
      ) : (
        <div className="vacancy-grid">
          {items.map((item) => (
            <article className="vacancy-card" key={item.id}>
              <div className="card-heading">
                <div className="company-logo">
                  <Bookmark size={20} />
                </div>

                <button
                  type="button"
                  className="icon-button delete-button"
                  disabled={deletingId === item.id}
                  onClick={() => void handleDelete(item.id)}
                  aria-label="Удалить сохранённую вакансию"
                >
                  <Trash2 size={19} />
                </button>
              </div>

              <h3>{item.title ?? 'Вакансия'}</h3>
              <p className="company-name">
                {item.company ?? 'Компания не указана'}
              </p>

              <div className="vacancy-details">
                <span>Источник: {item.source}</span>
              </div>

              {item.url && (
                <a
                  className="action-button api-vacancy-link"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Посмотреть вакансию
                  <ExternalLink size={15} />
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
