// PATRÓN INOCUIDAD — hook de datos M6
// M7-M12 replican esta estructura en src/hooks/use<Modulo>.ts:
//   - Filtra por org_id del contexto de auth (nunca del usuario)
//   - Expone { registros, loading, error, refetch }
//   - Join con ranchos para mostrar nombre y código sin queries adicionales

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'

export interface M6BotiquinConRancho {
  id: string
  rancho_id: string
  rancho_nombre: string
  rancho_codigo: string
  fecha_verificacion: string
  parches_curitas: boolean
  guantes_curacion: boolean
  vendas_tijeras: boolean
  gasas_cinta: boolean
  desinfectante: boolean
  responsable_id: string | null
  firma_verificacion: boolean
  org_id: string
  created_at: string
}

export function useBotiquin() {
  const { profile } = useAuthContext()
  const [registros, setRegistros] = useState<M6BotiquinConRancho[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!profile?.org_id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('m6_botiquin')
        .select('*, ranchos(nombre, codigo)')
        .eq('org_id', profile.org_id)
        .order('fecha_verificacion', { ascending: false })
        .limit(100)
      if (err) throw err
      setRegistros(
        (data ?? []).map((r: any) => ({
          ...r,
          rancho_nombre: r.ranchos?.nombre ?? '—',
          rancho_codigo: r.ranchos?.codigo ?? '—',
        }))
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar registros')
    } finally {
      setLoading(false)
    }
  }, [profile?.org_id])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { registros, loading, error, refetch: cargar }
}
