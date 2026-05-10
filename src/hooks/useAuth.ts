import { useState, useEffect } from 'react'
import { type User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Productor } from '@/types/database.types'

export interface AuthState {
  user: User | null
  profile: Profile | null
  productor: Productor | null
  asesorProfile: Profile | null
  responsableProfile: Profile | null
  loading: boolean
  error: string | null
}

async function cargarDatosPerfil(userId: string): Promise<Omit<AuthState, 'user' | 'loading'>> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return {
      profile: null,
      productor: null,
      asesorProfile: null,
      responsableProfile: null,
      error: profileError?.message ?? 'Perfil no encontrado',
    }
  }

  if (profile.rol !== 'operario') {
    return { profile, productor: null, asesorProfile: null, responsableProfile: null, error: null }
  }

  const { data: productor } = await supabase
    .from('productores')
    .select('*')
    .eq('profile_id', userId)
    .single()

  if (!productor) {
    return { profile, productor: null, asesorProfile: null, responsableProfile: null, error: null }
  }

  // Carga en paralelo los perfiles del asesor y del responsable de inocuidad
  let asesorProfile: Profile | null = null
  let responsableProfile: Profile | null = null

  await Promise.all([
    (async () => {
      if (!productor.asesor_id) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', productor.asesor_id)
        .single()
      asesorProfile = data
    })(),
    (async () => {
      if (!productor.responsable_inocuidad_id) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', productor.responsable_inocuidad_id)
        .single()
      responsableProfile = data
    })(),
  ])

  return { profile, productor, asesorProfile, responsableProfile, error: null }
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    productor: null,
    asesorProfile: null,
    responsableProfile: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session) {
          setState({
            user: null,
            profile: null,
            productor: null,
            asesorProfile: null,
            responsableProfile: null,
            loading: false,
            error: null,
          })
          return
        }

        const datosPerfil = await cargarDatosPerfil(session.user.id)
        setState({ user: session.user, ...datosPerfil, loading: false })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return state
}
