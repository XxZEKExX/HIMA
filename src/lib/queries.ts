import { supabase } from '@/lib/supabase'
import type {
  Aplicacion,
  AplicacionConProductos,
  AplicacionInsert,
  AplicacionProductoInsert,
  AplicacionRica,
  AplicacionUpdate,
  Rancho,
} from '@/types/database.types'

// ── Ranchos ──────────────────────────────────────────────────────────────────

export async function getRanchos(productorId?: string): Promise<Rancho[]> {
  let query = supabase
    .from('ranchos')
    .select('*')
    .eq('activo', true)
    .order('nombre')

  if (productorId) {
    query = query.eq('productor_id', productorId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// ── Aplicaciones ─────────────────────────────────────────────────────────────

export async function getAplicaciones(productorId?: string): Promise<Aplicacion[]> {
  let query = supabase
    .from('aplicaciones')
    .select('*')
    .order('fecha_aplicacion', { ascending: false })

  if (productorId) {
    query = query.eq('productor_id', productorId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAplicacionById(id: string): Promise<AplicacionConProductos> {
  const { data, error } = await supabase
    .from('aplicaciones')
    .select(`
      *,
      aplicacion_productos (
        *,
        catalogo_productos (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as AplicacionConProductos
}

export async function crearAplicacion(datos: AplicacionInsert): Promise<Aplicacion> {
  const { data, error } = await supabase
    .from('aplicaciones')
    .insert(datos)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function insertarProductosAplicacion(
  aplicacionId: string,
  productos: Omit<AplicacionProductoInsert, 'aplicacion_id'>[]
): Promise<void> {
  if (productos.length === 0) return
  const rows: AplicacionProductoInsert[] = productos.map((p) => ({
    ...p,
    aplicacion_id: aplicacionId,
  }))
  const { error } = await supabase.from('aplicacion_productos').insert(rows)
  if (error) throw error
}

const APLICACION_RICA_SELECT = `
  *,
  ranchos (*),
  productores!productor_id (
    id,
    profile_id,
    profiles!profile_id (nombre_completo)
  ),
  asesor:profiles!asesor_id (nombre_completo),
  responsable:profiles!responsable_inocuidad_id (nombre_completo),
  aplicacion_productos (
    *,
    catalogo_productos (*)
  )
` as const

export async function getAplicacionesRicas(productorId?: string): Promise<AplicacionRica[]> {
  let query = supabase
    .from('aplicaciones')
    .select(APLICACION_RICA_SELECT)
    .order('fecha_aplicacion', { ascending: false })

  if (productorId) {
    query = query.eq('productor_id', productorId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as unknown as AplicacionRica[]
}

export async function getAplicacionRicaById(id: string): Promise<AplicacionRica> {
  const { data, error } = await supabase
    .from('aplicaciones')
    .select(APLICACION_RICA_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as AplicacionRica
}

export async function actualizarAplicacion(
  id: string,
  datos: AplicacionUpdate
): Promise<Aplicacion> {
  const { data, error } = await supabase
    .from('aplicaciones')
    .update(datos)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
