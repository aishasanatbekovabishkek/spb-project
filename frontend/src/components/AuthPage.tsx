
import { useState, type FormEvent } from 'react'
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
} from 'lucide-react'
import {
  login,
  register,
} from '../services/auth'
import { ApiError } from '../services/api'
import './AuthPage.css'

type AuthMode = 'login' | 'register'

type AuthPageProps = {
  onBack: () => void
}

import { API_MODE } from '../config'

const API_ENABLED = API_MODE

export default function AuthPage({ onBack }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loading) return

    setMessage('')

    const credentials = {
      email: email.trim(),
      password,
    }

    if (!credentials.email || !credentials.password) {
      setMessage('Заполните все поля.')
      return
    }

    if (credentials.password.length < 8) {
      setMessage('Пароль должен содержать не менее 8 символов.')
      return
    }

    if (!API_ENABLED) {
      setMessage(
        'Демонстрационный режим: форма работает. ' +
        'Подключение к серверу пока отключено.',
      )
      return
    }

    setLoading(true)

    try {
      if (mode === 'register') {
        await register(credentials)

        // Registration creates the account.
        // Login then obtains the access token.
        await login(credentials)
      } else {
        await login(credentials)
      }

      // The token is now stored in memory by auth.ts.
      onBack()
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setMessage('Неверный email или пароль.')
        } else if (error.status === 409) {
          setMessage('Такой email уже зарегистрирован.')
        } else if (error.status === 422) {
          setMessage('Проверьте введённые данные.')
        } else {
          setMessage(error.message)
        }
      } else {
        setMessage('Произошла неожиданная ошибка.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <button
          type="button"
          className="auth-back"
          onClick={onBack}
        >
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
              type="button"
              className={mode === 'login' ? 'selected' : ''}
              onClick={() => changeMode('login')}
              disabled={loading}
            >
              Вход
            </button>

            <button
              type="button"
              className={mode === 'register' ? 'selected' : ''}
              onClick={() => changeMode('register')}
              disabled={loading}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="auth-email">
              Электронная почта
            </label>

            <div className="auth-input">
              <Mail size={18} />

              <input
                id="auth-email"
                type="email"
                placeholder="example@mail.com"
                autoComplete="email"
                required
                value={email}
                disabled={loading}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <label htmlFor="auth-password">
              Пароль
            </label>

            <div className="auth-input">
              <LockKeyhole size={18} />

              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Не менее 8 символов"
                autoComplete={
                  mode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                minLength={8}
                required
                value={password}
                disabled={loading}
                onChange={(event) => setPassword(event.target.value)}
              />

              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? 'Скрыть пароль' : 'Показать пароль'
                }
              >
                {showPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? 'Пожалуйста, подождите...'
                : mode === 'login'
                  ? 'Войти'
                  : 'Создать аккаунт'}

              {!loading && <ArrowRight size={18} />}
            </button>

            {message && (
              <p className="auth-message" role="status">
                {message}
              </p>
            )}
          </form>

          <p className="auth-note">
            {API_ENABLED
              ? 'Для входа используется API JobTracker.'
              : 'Демонстрационный режим. Пароль не отправляется на сервер.'}
          </p>
        </div>
      </section>

      <section className="auth-decoration">
        <div>
          <span>YOUR NEXT CHAPTER</span>

          <h2>
            Большие мечты начинаются с маленьких шагов.
          </h2>

          <p>
            Все возможности, отклики и достижения —
            в одном месте.
          </p>
        </div>

        <div className="auth-orb" />
      </section>
    </main>
  )
}
