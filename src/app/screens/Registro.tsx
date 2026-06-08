import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuthContext } from '@/context/AuthContext'

export function Registro() {
  const { signUp } = useAuthContext()
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreOrg, setNombreOrg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmacionPendiente, setConfirmacionPendiente] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setSubmitting(true)
    const { error: signUpError, requiresConfirmation } = await signUp(email, password, nombre)
    setSubmitting(false)

    if (signUpError) {
      setError(signUpError)
      return
    }

    if (requiresConfirmation) {
      setConfirmacionPendiente(true)
      return
    }

    // Sesión activa — ir a completar organización con el nombre precargado
    navigate('/completar-organizacion', { state: { nombreOrg } })
  }

  if (confirmacionPendiente) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-white text-xl" style={{ fontWeight: 600 }}>HF</span>
          </div>
          <div className="p-4 rounded-xl bg-agro-success-fill text-agro-success-text space-y-2">
            <p style={{ fontWeight: 600 }}>Revisa tu correo</p>
            <p className="text-sm">
              Enviamos un enlace de confirmación a <strong>{email}</strong>.
              Haz clic en el enlace y después inicia sesión para completar tu registro.
            </p>
          </div>
          <Link
            to="/login"
            className="block text-sm text-primary text-center"
            style={{ fontWeight: 600 }}
          >
            Ir a iniciar sesión
          </Link>
        </div>
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
          <h1 className="text-xl text-foreground" style={{ fontWeight: 600 }}>Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">AgroCampo · Hima Inocuidad Alimentaria</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block" style={{ fontWeight: 600 }}>
              Nombre completo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez García"
              required
              autoComplete="name"
              className="w-full h-12 px-4 rounded-lg border border-border bg-input-background
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

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
              placeholder="Mínimo 8 caracteres"
              required
              autoComplete="new-password"
              className="w-full h-12 px-4 rounded-lg border border-border bg-input-background
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block" style={{ fontWeight: 600 }}>
              Nombre de tu organización
            </label>
            <input
              type="text"
              value={nombreOrg}
              onChange={(e) => setNombreOrg(e.target.value)}
              placeholder="Ej: Rancho El Solar o tu nombre"
              required
              autoComplete="organization"
              className="w-full h-12 px-4 rounded-lg border border-border bg-input-background
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground pt-1">
              Nombre de tu empresa, o tu nombre si trabajas por tu cuenta.
            </p>
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
            {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary" style={{ fontWeight: 600 }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
