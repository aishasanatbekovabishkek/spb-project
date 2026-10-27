
import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness, Search, Bookmark, Send,
  LayoutDashboard, History, Trash2, MapPin,
  Wallet, CheckCircle2, Menu, X
} from 'lucide-react'
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
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [query, setQuery] = useState('')
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    readStorage('jobtracker_saved', [])
  )
  const [applications, setApplications] = useState<Application[]>(() =>
    readStorage('jobtracker_applications', [])
  )
  const [mobileMenu, setMobileMenu] = useState(false)

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
      [vacancy.title, vacancy.company, vacancy.city, ...vacancy.skills]
        .some((value) => value.toLowerCase().includes(normalized))
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

    const event = {
      status: 'applied' as Status,
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
            { status, date: new Date().toLocaleString('ru-RU') },
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
    { id: 'dashboard' as Page, title: 'Обзор', icon: LayoutDashboard },
    { id: 'vacancies' as Page, title: 'Вакансии', icon: Search },
    { id: 'saved' as Page, title: 'Сохранённые', icon: Bookmark },
    { id: 'applications' as Page, title: 'Мои отклики', icon: Send },
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
            className={`icon-button ${saved ? 'is-saved' : ''}`}
            onClick={() => toggleSaved(vacancy.id)}
            aria-label={saved ? 'Убрать из сохранённых' : 'Сохранить'}
            title={saved ? 'Убрать из сохранённых' : 'Сохранить'}
          >
            <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>

        <h3>{vacancy.title}</h3>
        <p className="company-name">{vacancy.company}</p>

        <div className="vacancy-details">
          <span><MapPin size={15} />{vacancy.city}</span>
          <span><Wallet size={15} />{vacancy.salary}</span>
        </div>

        <div className="tags">
          {vacancy.skills.map((skill) => (
            <span className="tag" key={skill}>{skill}</span>
          ))}
        </div>

        <button
          className={`action-button ${applied ? 'secondary-button' : ''}`}
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
          <p>Попробуйте изменить запрос или сохраните вакансии.</p>
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

  return (
    <div className="app-layout">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><BriefcaseBusiness size={23} /></div>
          <div>
            <strong>JobTracker</strong>
            <small>Ваш карьерный помощник</small>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Закрыть меню"
          >
            <X size={20} />
          </button>
        </div>

        <div className="menu-caption">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav className="navigation">
          {menu.map(({ id, title, icon: Icon }) => (
            <button
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
            className="menu-toggle"
            onClick={() => setMobileMenu(true)}
            aria-label="Открыть меню"
          >
            <Menu size={22} />
          </button>
          <span>Job Application Tracker</span>
          <span className="demo-label">MVP · DEMO</span>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">УПРАВЛЕНИЕ КАРЬЕРОЙ</div>
              <h1>{pageTitles[page]}</h1>
              <p>Все вакансии и отклики в одном месте.</p>
            </div>
          </div>

          {page === 'dashboard' && (
            <>
              <div className="welcome-panel">
                <div>
                  <span className="welcome-label">ВАШ ПУТЬ К НОВОЙ РАБОТЕ</span>
                  <h2>Новая возможность начинается здесь.</h2>
                  <p>Находите вакансии, сохраняйте интересные предложения и отслеживайте каждый этап.</p>
                  <button
                    className="white-button"
                    onClick={() => navigate('vacancies')}
                  >
                    Найти вакансии →
                  </button>
                </div>
                <BriefcaseBusiness className="welcome-art" size={120} />
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
                    {applications.filter((a) => a.status === 'offer').length}
                  </strong>
                  <small>Успешные результаты</small>
                </div>
              </div>

              <div className="section-heading">
                <h2>Актуальные вакансии</h2>
                <button className="text-button" onClick={() => navigate('vacancies')}>
                  Смотреть все →
                </button>
              </div>
              <VacancyGrid items={vacancies.slice(0, 3)} />
            </>
          )}

          {page === 'vacancies' && (
            <>
              <div className="search-panel">
                <Search size={21} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Должность, компания, технология или город..."
                  aria-label="Поиск вакансий"
                />
                {query && (
                  <button onClick={() => setQuery('')} aria-label="Очистить">
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
          )}

          {page === 'saved' && (
            <>
              <div className="section-heading">
                <h2>Ваши избранные вакансии</h2>
                <span className="results-count">{savedIds.length}</span>
              </div>
              {savedIds.length ? (
                <VacancyGrid
                  items={vacancies.filter((v) => savedIds.includes(v.id))}
                />
              ) : (
                <div className="empty-state">
                  <Bookmark size={36} />
                  <h3>Пока ничего не сохранено</h3>
                  <p>Перейдите к поиску и нажмите на значок закладки.</p>
                  <button
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
                    className="action-button"
                    onClick={() => navigate('vacancies')}
                  >
                    Найти вакансии
                  </button>
                </div>
              ) : (
                <div className="applications-list">
                  {applications.map((application) => {
                    const vacancy = getVacancy(application.vacancyId)
                    if (!vacancy) return null

                    return (
                      <article className="application-card" key={application.id}>
                        <div className="application-top">
                          <div>
                            <h3>{vacancy.title}</h3>
                            <p>{vacancy.company} · {vacancy.city}</p>
                          </div>
                          <button
                            className="icon-button delete-button"
                            onClick={() => removeApplication(application.id)}
                            aria-label="Удалить отклик"
                            title="Удалить отклик"
                          >
                            <Trash2 size={19} />
                          </button>
                        </div>

                        <div className="status-row">
                          <span className="status-label">Текущий статус</span>
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
                            {statusOptions.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="history-block">
                          <h4><History size={16} /> История статусов</h4>
                          {application.history.slice().reverse().map((item, index) => (
                            <div className="history-item" key={index}>
                              <CheckCircle2 size={16} />
                              <span>{statusLabels[item.status]}</span>
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
