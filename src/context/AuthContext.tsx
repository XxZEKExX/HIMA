import { createContext, useContext, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, type UseAuthReturn } from '@/hooks/useAuth'

interface AuthContextValue extends UseAuthReturn {
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  signUp: (
    email: string,
    password: string,
    nombreCompleto: string,
    captchaToken?: string
  ) => Promise<{ error: string | null; requiresConfirmation: boolean }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuth()

  async function signIn(email: string, password: string, captchaToken?: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
    return { error: error?.message ?? null }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
  }

  async function signUp(
    email: string,
    password: string,
    nombreCompleto: string,
    captchaToken?: string
  ): Promise<{ error: string | null; requiresConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre_completo: nombreCompleto },
        ...(captchaToken ? { captchaToken } : {}),
      },
    })
    if (error) return { error: error.message, requiresConfirmation: false }
    // Si no hay sesión, Supabase requiere confirmación por correo
    return { error: null, requiresConfirmation: !data.session }
  }

  return (
    <AuthContext.Provider value={{ ...authState, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext debe usarse dentro de AuthProvider')
  return ctx
}
