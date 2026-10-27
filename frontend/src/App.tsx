
import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  LayoutDashboard,
  History,
  Bookmark,
  Send,
  Trash2,
  MapPin,
  Wallet,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react'
import AuthPage from './components/AuthPage'
import ApiVacanciesPage from './components/ApiVacanciesPage'
import { API_MODE } from './config'
import './App.css'

type Page = 'dashboard' | 'vacancies' | 'saved' | 'applications'

type Status =
  | 'applied'
  | 'hr_interview'
  | 'technical_interview'
  | 'test_task'
  | 'offer'
  | 'rejected'

type Vacancy = {
  id: string
  title: string
  company: string
  city: string
  salary: string
  skills: string[]
}

type StatusEvent = {
  status: Status
  date: string
}

type Application = {
  id: string
  vacancyId: string
  status: Status
  history: StatusEvent[]
}

const vacancies: Vacancy[] = [
  {
    id: '1',
    title: 'Python Backend Developer',
    company: 'TechNova',
    city: 'Москва · Удалённо',
    salary: '180 000–250 000 ₽',
    skills: ['Python', 'FastAPI', 'PostgreSQL'],
  },
  {
    id: '2',
    title: 'Frontend React Developer',
    company: 'Digital Lab',
    city: 'Санкт-Петербург · Гибрид',
    salary: '120 000–180 000 ₽',
    skills: ['React', 'TypeScript', 'Vite'],
  },
  {
    id: '3',
    title: 'Junior Python Developer',
    company: 'Cloud Solutions',
    city: 'Удалённо',
    salary: '80 000–120 000 ₽',
    skills: ['Python', 'Django', 'REST API'],
  },
  {
    id: '4',
    title: 'Fullstack Developer',
    company: 'Product House',
    city: 'Казань · Удалённо',
    salary: '160 000–230 000 ₽',
    skills: ['React', 'Python', 'Docker'],
  },
  {
    id: '5',
    title: 'Backend Engineer',
    company: 'FinTech Studio',
    city: 'Москва · Гибрид',
    salary: '200 000–300 000 ₽',
    skills: ['FastAPI', 'Redis', 'SQLAlchemy'],
  },
  {
    id: '6',
    title: 'React / TypeScript Developer',
    company: 'Bright Apps',
    city: 'Удалённо',
    salary: '130 000–190 000 ₽',
    skills: ['React', 'TypeScript', 'CSS'],
  },
]

const statusLabels: Record<Status, string> = {
  applied: 'Отклик отправлен',
  hr_interview: 'HR-собеседование',
  technical_interview: 'Техническое интервью',
  test_task: 'Тестовое задание',
  offer: 'Оффер',
  rejected: 'Отказ',
}

const statusOptions = Object.entries(statusLabels) as [Status, string][]

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

// Kitty-inspired logo
function KittyMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden="true"
    >
      {/* Head and ears */}
      <path
        d="
          M19 43
          C16 31 14 12 24 11
          C32 10 39 19 45 21
          C55 18 69 18 79 21
          C85 15 95 9 101 13
          C107 18 104 34 101 43
          C108 52 108 67 103 76
          C96 90 79 94 60 94
          C41 94 24 90 17 76
          C12 66 12 53 19 43
          Z
        "
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Eyes */}
      <ellipse cx="43" cy="59" rx="2.8" ry="4.2" fill="currentColor" />
      <ellipse cx="77" cy="59" rx="2.8" ry="4.2" fill="currentColor" />

      {/* Nose */}
      <ellipse cx="60" cy="68" rx="4.2" ry="2.8" fill="currentColor" />

      {/* Whiskers */}
      <path
        d="M28 64 L5 60 M28 72 L5 76 M29 79 L9 89"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M92 64 L115 60 M92 72 L115 76 M91 79 L111 89"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Bow */}
      <g
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="
            M88 29
            C82 23 73 19 70 24
            C67 29 70 36 75 38
            C79 40 84 36 88 34
            Z
          "
          fill="none"
        />
        <path
          d="
            M96 29
            C102 24 110 22 113 28
            C116 34 110 40 105 40
            C101 40 98 36 95 34
            Z
          "
          fill="none"
        />
        <ellipse
          cx="92"
          cy="32"
          rx="5"
          ry="5.5"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  )
}

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [query, setQuery] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)

  const [savedIds, setSavedIds] = useState<string[]>(() =>
    readStorage('jobtracker_saved', [])
  )

  const [applications, setApplications] = useState<Application[]>(() =>
    readStorage('jobtracker_applications', [])
  )

  useEffect(() => {
    localStorage.setItem('jobtracker_saved', JSON.stringify(savedIds))
  }, [savedIds])

  useEffect(() => {
    localStorage.setItem(
      'jobtracker_applications',
      JSON.stringify(applications)
    )
  }, [applications])

  const filteredVacancies = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return vacancies.filter((vacancy) =>
      [
        vacancy.title,
        vacancy.company,
        vacancy.city,
        ...vacancy.skills,
      ].some((value) => value.toLowerCase().includes(normalized))
    )
  }, [query])

  const getVacancy = (id: string) =>
    vacancies.find((vacancy) => vacancy.id === id)

  function toggleSaved(id: string) {
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  function createApplication(vacancyId: string) {
    if (applications.some((item) => item.vacancyId === vacancyId)) {
      setPage('applications')
      return
    }

    const event: StatusEvent = {
      status: 'applied',
      date: new Date().toLocaleString('ru-RU'),
    }

    setApplications((current) => [
      {
        id: crypto.randomUUID(),
        vacancyId,
        status: 'applied',
        history: [event],
      },
      ...current,
    ])

    setPage('applications')
  }

  function updateStatus(id: string, status: Status) {
    setApplications((current) =>
      current.map((application) => {
        if (application.id !== id || application.status === status) {
          return application
        }

        return {
          ...application,
          status,
          history: [
            ...application.history,
            {
              status,
              date: new Date().toLocaleString('ru-RU'),
            },
          ],
        }
      })
    )
  }

  function removeApplication(id: string) {
    setApplications((current) =>
      current.filter((item) => item.id !== id)
    )
  }

  function navigate(nextPage: Page) {
    setPage(nextPage)
    setMobileMenu(false)
  }

  const menu = [
    {
      id: 'dashboard' as Page,
      title: 'Обзор',
      icon: LayoutDashboard,
    },
    {
      id: 'vacancies' as Page,
      title: 'Вакансии',
      icon: Search,
    },
    {
      id: 'saved' as Page,
      title: 'Сохранённые',
      icon: Bookmark,
    },
    {
      id: 'applications' as Page,
      title: 'Мои отклики',
      icon: Send,
    },
  ]

  const pageTitles: Record<Page, string> = {
    dashboard: 'Обзор',
    vacancies: 'Поиск вакансий',
    saved: 'Сохранённые вакансии',
    applications: 'Мои отклики',
  }

  function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
    const saved = savedIds.includes(vacancy.id)

    const applied = applications.some(
      (item) => item.vacancyId === vacancy.id
    )

    return (
      <article className="vacancy-card">
        <div className="card-heading">
          <div className="company-logo">
            {vacancy.company.slice(0, 1)}
          </div>

          <button
            type="button"
            className={`icon-button ${saved ? 'is-saved' : ''}`}
            onClick={() => toggleSaved(vacancy.id)}
            aria-label={
              saved ? 'Убрать из сохранённых' : 'Сохранить вакансию'
            }
            title={
              saved ? 'Убрать из сохранённых' : 'Сохранить вакансию'
            }
          >
            <Bookmark
              size={20}
              fill={saved ? 'currentColor' : 'none'}
            />
          </button>
        </div>

        <h3>{vacancy.title}</h3>
        <p className="company-name">{vacancy.company}</p>

        <div className="vacancy-details">
          <span>
            <MapPin size={15} />
            {vacancy.city}
          </span>
          <span>
            <Wallet size={15} />
            {vacancy.salary}
          </span>
        </div>

        <div className="tags">
          {vacancy.skills.map((skill) => (
            <span className="tag" key={skill}>
              {skill}
            </span>
          ))}
        </div>

        <button
          type="button"
          className={`action-button ${
            applied ? 'secondary-button' : ''
          }`}
          onClick={() => createApplication(vacancy.id)}
        >
          {applied ? 'Посмотреть отклик' : 'Добавить отклик'}
        </button>
      </article>
    )
  }

  function VacancyGrid({ items }: { items: Vacancy[] }) {
    if (!items.length) {
      return (
        <div className="empty-state">
          <Search size={32} />
          <h3>Ничего не найдено</h3>
          <p>Попробуйте изменить поисковый запрос.</p>
        </div>
      )
    }

    return (
      <div className="vacancy-grid">
        {items.map((vacancy) => (
          <VacancyCard key={vacancy.id} vacancy={vacancy} />
        ))}
      </div>
    )
  }

  // Display the authentication page without deleting app data.
  if (showAuth) {
    return (
      <AuthPage onBack={() => setShowAuth(false)} />
    )
  }

  return (
    <div className="app-layout">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon kitty-badge">
            <KittyMark className="kitty-icon" />
          </div>

          <div>
            <strong>JobTracker</strong>
            <small>Ваш карьерный помощник</small>
          </div>

          <button
            type="button"
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Закрыть меню"
          >
            <X size={20} />
          </button>
        </div>

        <div className="menu-caption">
          РАБОЧЕЕ ПРОСТРАНСТВО
        </div>

        <nav className="navigation">
          {menu.map(({ id, title, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{title}</span>

              {id === 'saved' && savedIds.length > 0 && (
                <span className="nav-count">{savedIds.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <span className="demo-dot" />
          Демонстрационный режим
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMobileMenu(true)}
            aria-label="Открыть меню"
          >
            <Menu size={22} />
          </button>

          <span>Job Application Tracker</span>

          <div className="topbar-actions">
            <span className="demo-label">MVP · DEMO</span>

            <button
              type="button"
              className="login-button"
              onClick={() => setShowAuth(true)}
            >
              Войти
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                УПРАВЛЕНИЕ КАРЬЕРОЙ
              </div>

              <h1>{pageTitles[page]}</h1>

              <p>Все вакансии и отклики в одном месте.</p>
            </div>
          </div>

          {page === 'dashboard' && (
            <>
              <div className="welcome-panel">
                <div>
                  <span className="welcome-label">
                    ВАШ ПУТЬ К НОВОЙ РАБОТЕ
                  </span>

                  <h2>
                    Новая возможность начинается здесь.
                  </h2>

                  <p>
                    Находите вакансии, сохраняйте интересные
                    предложения и отслеживайте каждый этап.
                  </p>

                  <button
                    type="button"
                    className="white-button"
                    onClick={() => navigate('vacancies')}
                  >
                    Найти вакансии →
                  </button>
                </div>

                <div className="welcome-art kitty-hero-mark">
                  <KittyMark className="hero-kitty-icon" />
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <span>Доступно вакансий</span>
                  <strong>{vacancies.length}</strong>
                  <small>В демонстрационном каталоге</small>
                </div>

                <div className="stat-card">
                  <span>Сохранённые</span>
                  <strong>{savedIds.length}</strong>
                  <small>Интересующие предложения</small>
                </div>

                <div className="stat-card">
                  <span>Всего откликов</span>
                  <strong>{applications.length}</strong>
                  <small>Добавлены в трекер</small>
                </div>

                <div className="stat-card">
                  <span>Офферы</span>
                  <strong>
                    {
                      applications.filter(
                        (item) => item.status === 'offer'
                      ).length
                    }
                  </strong>
                  <small>Успешные результаты</small>
                </div>
              </div>

              <div className="section-heading">
                <h2>Актуальные вакансии</h2>

                <button
                  type="button"
                  className="text-button"
                  onClick={() => navigate('vacancies')}
                >
                  Смотреть все →
                </button>
              </div>

              <VacancyGrid items={vacancies.slice(0, 3)} />
            </>
          )}

          {page === 'vacancies' && (
            API_MODE ? (
              <ApiVacanciesPage />
            ) : (
            <>
              <div className="search-panel">
                <Search size={21} />

                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Должность, компания, технология или город..."
                  aria-label="Поиск вакансий"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Очистить поиск"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <div className="section-heading">
                <h2>Результаты поиска</h2>
                <span className="results-count">
                  Найдено: {filteredVacancies.length}
                </span>
              </div>

              <VacancyGrid items={filteredVacancies} />
            </>
            )
          )}

          {page === 'saved' && (
            <>
              <div className="section-heading">
                <h2>Ваши избранные вакансии</h2>

                <span className="results-count">
                  {savedIds.length}
                </span>
              </div>

              {savedIds.length > 0 ? (
                <VacancyGrid
                  items={vacancies.filter((vacancy) =>
                    savedIds.includes(vacancy.id)
                  )}
                />
              ) : (
                <div className="empty-state">
                  <Bookmark size={36} />

                  <h3>Пока ничего не сохранено</h3>

                  <p>
                    Перейдите к поиску и нажмите
                    на значок закладки.
                  </p>

                  <button
                    type="button"
                    className="action-button"
                    onClick={() => navigate('vacancies')}
                  >
                    Перейти к вакансиям
                  </button>
                </div>
              )}
            </>
          )}

          {page === 'applications' && (
            <>
              <div className="section-heading">
                <h2>История ваших откликов</h2>

                <span className="results-count">
                  Всего: {applications.length}
                </span>
              </div>

              {applications.length === 0 ? (
                <div className="empty-state">
                  <Send size={36} />

                  <h3>Откликов пока нет</h3>

                  <p>Добавьте первую вакансию в трекер.</p>

                  <button
                    type="button"
                    className="action-button"
                    onClick={() => navigate('vacancies')}
                  >
                    Найти вакансии
                  </button>
                </div>
              ) : (
                <div className="applications-list">
                  {applications.map((application) => {
                    const vacancy = getVacancy(
                      application.vacancyId
                    )

                    if (!vacancy) {
                      return null
                    }

                    return (
                      <article
                        className="application-card"
                        key={application.id}
                      >
                        <div className="application-top">
                          <div>
                            <h3>{vacancy.title}</h3>

                            <p>
                              {vacancy.company} · {vacancy.city}
                            </p>
                          </div>

                          <button
                            type="button"
                            className="icon-button delete-button"
                            onClick={() =>
                              removeApplication(application.id)
                            }
                            aria-label="Удалить отклик"
                            title="Удалить отклик"
                          >
                            <Trash2 size={19} />
                          </button>
                        </div>

                        <div className="status-row">
                          <span className="status-label">
                            Текущий статус
                          </span>

                          <select
                            value={application.status}
                            onChange={(event) =>
                              updateStatus(
                                application.id,
                                event.target.value as Status
                              )
                            }
                            className={`status-select status-${application.status}`}
                            aria-label="Изменить статус отклика"
                          >
                            {statusOptions.map(
                              ([value, label]) => (
                                <option
                                  key={value}
                                  value={value}
                                >
                                  {label}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div className="history-block">
                          <h4>
                            <History size={16} />
                            История статусов
                          </h4>

                          {application.history
                            .slice()
                            .reverse()
                            .map((item, index) => (
                              <div
                                className="history-item"
                                key={index}
                              >
                                <CheckCircle2 size={16} />

                                <span>
                                  {statusLabels[item.status]}
                                </span>

                                <time>{item.date}</time>
                              </div>
                            ))}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
