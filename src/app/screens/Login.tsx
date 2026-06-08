import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuthContext } from '@/context/AuthContext'

export function Login() {
  const { user, loading, signIn } = useAuthContext()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Si ya hay sesión activa, redirige al inicio
  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await signIn(email, password)
    setSubmitting(false)
    if (result.error) {
      setError('Correo o contraseña incorrectos')
    } else {
      navigate('/', { replace: true })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <span className="text-white text-xl" style={{ fontWeight: 600 }}>HF</span>
          </div>
          <h1 className="text-xl text-foreground" style={{ fontWeight: 600 }}>AgroCampo</h1>
          <p className="text-sm text-muted-foreground">Hima Inocuidad Alimentaria</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block" style={{ fontWeight: 600 }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              autoComplete="email"
              className="w-full h-12 px-4 rounded-lg border border-border bg-input-background
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block" style={{ fontWeight: 600 }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full h-12 px-4 rounded-lg border border-border bg-input-background
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-agro-danger-fill text-agro-danger-text text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 bg-primary text-white rounded-3xl hover:bg-agro-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontWeight: 600 }}
          >
            {submitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="text-primary" style={{ fontWeight: 600 }}>
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
