// PATRÓN INOCUIDAD M11 — hook de datos
// Carga m11_inspeccion con join a ranchos.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'

export interface M11InspeccionResumen {
  id: string
  rancho_id: string
  rancho_nombre: string
  rancho_codigo: string
  fecha: string
  realizado_por_nombre: string | null
  observaciones: string | null
  created_at: string
}

export function useM11Preoperacional() {
  const { profile } = useAuthContext()
  const [inspecciones, setInspecciones] = useState<M11InspeccionResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!profile?.org_id) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('m11_inspeccion')
        .select('*, ranchos(nombre, codigo)')
        .eq('org_id', profile.org_id)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200)
      if (err) throw err

      const lista: M11InspeccionResumen[] = ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        rancho_id: r.rancho_id,
        rancho_nombre: r.ranchos?.nombre ?? '—',
        rancho_codigo: r.ranchos?.codigo ?? '—',
        fecha: r.fecha,
        realizado_por_nombre: r.realizado_por_nombre ?? null,
        observaciones: r.observaciones ?? null,
        created_at: r.created_at,
      }))
      setInspecciones(lista)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar inspecciones M11')
    } finally {
      setLoading(false)
    }
  }, [profile?.org_id])

  useEffect(() => { cargar() }, [cargar])

  return { inspecciones, loading, error, refetch: cargar }
}
