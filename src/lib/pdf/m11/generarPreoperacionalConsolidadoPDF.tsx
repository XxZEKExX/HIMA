// Genera y descarga el PDF consolidado M11 (varias inspecciones de un rancho).

import { pdf } from '@react-pdf/renderer'
import { supabase } from '@/lib/supabase'
import {
  PreoperacionalConsolidadoPDF,
  type PreoperacionalPaginaProps,
  type ValorPreoperacional,
} from './PreoperacionalPDF'

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function generarPreoperacionalConsolidadoPDF(
  ranchoId: string,
  ranchoNombre: string,
  orgId: string,
  desde: string,
  hasta: string,
): Promise<void> {
  // 1. Cargar inspecciones en el rango
  const { data: inspData, error: inspErr } = await supabase
    .from('m11_inspeccion')
    .select('id, fecha, realizado_por_nombre, observaciones, ranchos(nombre, codigo)')
    .eq('org_id', orgId)
    .eq('rancho_id', ranchoId)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: true })
  if (inspErr) throw inspErr
  if (!inspData || inspData.length === 0) {
    throw new Error('No hay inspecciones en ese rango para el rancho seleccionado')
  }

  const ids = (inspData as any[]).map((i) => i.id as string)

  // 2. Cargar catálogo y todos los resultados en paralelo
  const [catalogoRes, resultadosRes] = await Promise.all([
    supabase
      .from('m11_items_catalogo')
      .select('id, seccion_label, item, default_valor')
      .order('orden'),
    supabase
      .from('m11_resultados')
      .select('inspeccion_id, item_id, valor, codigo_correctivo')
      .in('inspeccion_id', ids)
      .eq('org_id', orgId),
  ])
  if (catalogoRes.error) throw catalogoRes.error
  if (resultadosRes.error) throw resultadosRes.error

  const catalogo = catalogoRes.data ?? []

  // Indexar resultados por inspeccion_id → item_id
  const resultMap: Record<string, Record<string, { valor: string; cc: string | null }>> = {}
  for (const r of resultadosRes.data ?? []) {
    const row = r as any
    if (!resultMap[row.inspeccion_id]) resultMap[row.inspeccion_id] = {}
    resultMap[row.inspeccion_id][row.item_id] = { valor: row.valor, cc: row.codigo_correctivo ?? null }
  }

  // 3. Construir una página por inspección
  const paginas: PreoperacionalPaginaProps[] = (inspData as any[]).map((insp) => {
    const rMap = resultMap[insp.id] ?? {}
    return {
      rancho: insp.ranchos?.nombre ?? ranchoNombre,
      ranchoCodigo: insp.ranchos?.codigo ?? '—',
      fecha: insp.fecha,
      realizadoPor: insp.realizado_por_nombre ?? null,
      observaciones: insp.observaciones ?? null,
      items: (catalogo as any[]).map((cat) => ({
        id: cat.id,
        seccion_label: cat.seccion_label,
        item: cat.item,
        valor: (rMap[cat.id]?.valor ?? cat.default_valor) as ValorPreoperacional,
        codigo_correctivo: rMap[cat.id]?.cc ?? null,
      })),
    }
  })

  const desdeSlug = desde.replaceAll('-', '')
  const hastaSlug = hasta.replaceAll('-', '')
  const ranchoSlug = slugify(ranchoNombre)
  const filename = `preoperacional-consolidado-${ranchoSlug}-${desdeSlug}-${hastaSlug}.pdf`

  const blob = await pdf(
    <PreoperacionalConsolidadoPDF
      paginas={paginas}
      ranchoNombre={ranchoNombre}
      desde={desde}
      hasta={hasta}
    />
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
