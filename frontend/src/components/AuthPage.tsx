
import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight } from 'lucide-react'
import './AuthPage.css'

type AuthMode = 'login' | 'register'

type AuthPageProps = {
  onBack: () => void
}

export default function AuthPage({ onBack }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim() || !password) {
      setMessage('Заполните все поля.')
      return
    }

    if (password.length < 8) {
      setMessage('Пароль должен содержать не менее 8 символов.')
      return
    }

    setMessage(
      'Форма готова. Авторизация станет доступна после подключения FastAPI.',
    )
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setMessage('')
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <button className="auth-back" onClick={onBack}>
          ← Вернуться в приложение
        </button>

        <div className="auth-card">
          <span className="auth-eyebrow">JOBTRACKER</span>

          <h1>
            {mode === 'login'
              ? 'С возвращением!'
              : 'Начнём новую главу'}
          </h1>

          <p className="auth-description">
            {mode === 'login'
              ? 'Войдите, чтобы управлять своими вакансиями и откликами.'
              : 'Создайте аккаунт, чтобы отслеживать свой карьерный путь.'}
          </p>

          <div className="auth-tabs">
            <button
              className={mode === 'login' ? 'selected' : ''}
              onClick={() => changeMode('login')}
            >
              Вход
            </button>

            <button
              className={mode === 'register' ? 'selected' : ''}
              onClick={() => changeMode('register')}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="auth-email">Электронная почта</label>
            <div className="auth-input">
              <Mail size={18} />
              <input
                id="auth-email"
                type="email"
                placeholder="example@mail.com"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <label htmlFor="auth-password">Пароль</label>
            <div className="auth-input">
              <LockKeyhole size={18} />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Не менее 8 символов"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" className="auth-submit">
              {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
              <ArrowRight size={18} />
            </button>

            {message && (
              <p className="auth-message" role="status">
                {message}
              </p>
            )}
          </form>

          <p className="auth-note">
            Демонстрационная форма. Данные пока не отправляются на сервер.
          </p>
        </div>
      </section>

      <section className="auth-decoration">
        <div>
          <span>YOUR NEXT CHAPTER</span>
          <h2>Большие мечты начинаются с маленьких шагов.</h2>
          <p>Все возможности, отклики и достижения — в одном месте.</p>
        </div>
        <div className="auth-orb" />
      </section>
    </main>
  )
}
