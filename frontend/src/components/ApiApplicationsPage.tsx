import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  History,
  RefreshCw,
  Send,
  AlertTriangle,
} from 'lucide-react'

import {
  getApplications,
  getApplicationHistory,
  updateApplicationStatus,
  type ApplicationWithVacancy,
  type ApplicationStatus,
  type StatusHistoryItem,
} from '../services/applications'
import { ApiError } from '../services/api'

const statusLabels: Record<ApplicationStatus, string> = {
  applied: 'Отклик отправлен',
  hr_interview: 'Собеседование с HR',
  technical_interview: 'Техническое собеседование',
  test_task: 'Тестовое задание',
  offer: 'Предложение о работе',
  rejected: 'Отказ',
}

const statusOptions = Object.entries(statusLabels) as [
  ApplicationStatus,
  string,
][]

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('ru-RU')
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Для работы с откликами необходимо войти в аккаунт.'
    }

    return error.message
  }

  return 'Не удалось выполнить запрос.'
}

export default function ApiApplicationsPage() {
  const [applications, setApplications] = useState<
    ApplicationWithVacancy[]
  >([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<StatusHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const loadApplications = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getApplications()
      setApplications(result.items)
    } catch (err) {
      setError(errorMessage(err))
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadApplications()
  }, [loadApplications])

  async function loadHistory(id: string) {
    if (selectedId === id) {
      setSelectedId(null)
      return
    }

    setSelectedId(id)
    setHistory([])
    setHistoryError(null)
    setHistoryLoading(true)

    try {
      const result = await getApplicationHistory(id)
      setHistory(result.items)
    } catch (err) {
      setHistoryError(errorMessage(err))
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleStatusChange(
    id: string,
    status: ApplicationStatus,
  ) {
    setUpdatingId(id)
    setError(null)

    try {
      const result = await updateApplicationStatus(id, status)

      setApplications((current) =>
        current.map((application) =>
          application.id === id
            ? {
                ...application,
                status: result.status,
                updated_at: result.updated_at,
              }
            : application,
        ),
      )

      if (selectedId === id) {
        const updatedHistory = await getApplicationHistory(id)
        setHistory(updatedHistory.items)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="api-applications">
      <div className="section-heading">
        <h2>Мои отклики</h2>

        <button
          type="button"
          className="text-button"
          disabled={loading}
          onClick={() => void loadApplications()}
        >
          <RefreshCw size={15} />
          Обновить
        </button>
      </div>

      {error && (
        <div className="api-error" role="alert">
          <AlertTriangle size={19} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="api-empty" role="status">
          <RefreshCw size={28} className="api-spinner" />
          <p>Загружаем ваши отклики...</p>
        </div>
      ) : applications.length === 0 && !error ? (
        <div className="empty-state">
          <Send size={36} />
          <h3>Откликов пока нет</h3>
          <p>
            Найдите интересную вакансию и добавьте отклик.
          </p>
        </div>
      ) : (
        <div className="applications-list">
          {applications.map((application) => (
            <article
              className="application-card"
              key={application.id}
            >
              <div className="application-top">
                <div>
                  <h3>{application.vacancy.title}</h3>

                  <p>
                    {application.vacancy.company ??
                      'Компания не указана'}
                  </p>
                </div>

                <span className="results-count">
                  {formatDate(application.created_at)}
                </span>
              </div>

              <div className="status-row">
                <span className="status-label">
                  Текущий статус
                </span>

                <select
                  className={`status-select status-${application.status}`}
                  value={application.status}
                  disabled={updatingId === application.id}
                  aria-label="Изменить статус отклика"
                  onChange={(event) =>
                    void handleStatusChange(
                      application.id,
                      event.target.value as ApplicationStatus,
                    )
                  }
                >
                  {statusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() => void loadHistory(application.id)}
              >
                <History size={16} />
                {selectedId === application.id
                  ? 'Скрыть историю'
                  : 'Показать историю'}
              </button>

              {selectedId === application.id && (
                <div className="history-block api-history">
                  <h4>
                    <History size={16} />
                    История изменения статусов
                  </h4>

                  {historyLoading ? (
                    <p className="results-count">
                      Загружаем историю...
                    </p>
                  ) : historyError ? (
                    <div className="api-error" role="alert">
                      {historyError}
                    </div>
                  ) : history.length === 0 ? (
                    <p className="results-count">
                      История пока отсутствует.
                    </p>
                  ) : (
                    history.map((item) => (
                      <div
                        className="history-item"
                        key={item.id}
                      >
                        <CheckCircle2 size={16} />

                        <span>
                          {item.old_status
                            ? `${statusLabels[item.old_status]} → `
                            : 'Создан отклик → '}
                          {statusLabels[item.new_status]}
                        </span>

                        <time>
                          {formatDate(item.changed_at)}
                        </time>
                      </div>
                    ))
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
