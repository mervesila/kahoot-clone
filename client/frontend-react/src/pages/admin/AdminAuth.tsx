import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { KahootButton } from '@/components/KahootButton'
import { KahootInput } from '@/components/KahootInput'
import { Logo } from '@/components/Logo'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/context/auth'

type Mode = 'login' | 'register'

export function AdminAuth() {
  const { isAuthenticated, login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')

  const [registrationNumber, setRegistrationNumber] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [department, setDepartment] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (mode === 'register' && password !== passwordConfirm) {
      setError('Parolalar eşleşmiyor.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(registrationNumber.trim(), password)
      } else {
        await register({
          registrationNumber: registrationNumber.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          department: department.trim(),
        })
      }
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'İşlem başarısız.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-kahoot-purple px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1.5">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={[
              'rounded-xl py-2.5 font-black uppercase tracking-wide transition-colors',
              mode === 'login' ? 'bg-white text-kahoot-purple' : 'text-white/80',
            ].join(' ')}
          >
            Giriş
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={[
              'rounded-xl py-2.5 font-black uppercase tracking-wide transition-colors',
              mode === 'register' ? 'bg-white text-kahoot-purple' : 'text-white/80',
            ].join(' ')}
          >
            Kayıt Ol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="animate-float-up space-y-4 rounded-3xl bg-white/10 p-6">
          <KahootInput
            label="Sicil Numarası"
            placeholder="Örn: ADM100"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
          />

          {mode === 'register' ? (
            <>
              <KahootInput
                label="Ad"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <KahootInput
                label="Soyad"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <KahootInput
                label="Departman"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </>
          ) : null}

          <KahootInput
            label="Parola"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {mode === 'register' ? (
            <KahootInput
              label="Parola (Tekrar)"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          ) : null}

          <Alert>{error}</Alert>

          <KahootButton type="submit" variant="blue" size="lg" full loading={loading}>
            {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </KahootButton>
        </form>
      </div>
    </div>
  )
}
