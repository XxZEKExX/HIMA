// Genera y descarga el PDF individual de una inspección M11.

import { pdf } from '@react-pdf/renderer'
import { supabase } from '@/lib/supabase'
import { PreoperacionalPDF, type PreoperacionalPaginaProps, type ValorPreoperacional } from './PreoperacionalPDF'

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function construirDatosPagina(
  inspeccionId: string,
  orgId: string,
): Promise<PreoperacionalPaginaProps> {
  const [inspeccionRes, catalogoRes] = await Promise.all([
    supabase
      .from('m11_inspeccion')
      .select('*, ranchos(nombre, codigo)')
      .eq('id', inspeccionId)
      .single(),
    supabase
      .from('m11_items_catalogo')
      .select('id, seccion_label, item, default_valor')
      .order('orden'),
  ])

  if (inspeccionRes.error) throw inspeccionRes.error
  const insp = inspeccionRes.data as any

  // Cargar resultados de esta inspección
  const { data: resultados, error: resErr } = await supabase
    .from('m11_resultados')
    .select('item_id, valor, codigo_correctivo')
    .eq('inspeccion_id', inspeccionId)
    .eq('org_id', orgId)
  if (resErr) throw resErr

  const resultMap: Record<string, { valor: string; cc: string | null }> = {}
  for (const r of resultados ?? []) {
    resultMap[(r as any).item_id] = {
      valor: (r as any).valor,
      cc: (r as any).codigo_correctivo ?? null,
    }
  }

  const items = (catalogoRes.data ?? []).map((cat: any) => ({
    id: cat.id,
    seccion_label: cat.seccion_label,
    item: cat.item,
    valor: (resultMap[cat.id]?.valor ?? cat.default_valor) as ValorPreoperacional,
    codigo_correctivo: resultMap[cat.id]?.cc ?? null,
  }))

  return {
    rancho: insp.ranchos?.nombre ?? '—',
    ranchoCodigo: insp.ranchos?.codigo ?? '—',
    fecha: insp.fecha,
    realizadoPor: insp.realizado_por_nombre ?? null,
    items,
    observaciones: insp.observaciones ?? null,
  }
}

export async function generarPreoperacionalPDF(
  inspeccionId: string,
  orgId: string,
): Promise<void> {
  const datos = await construirDatosPagina(inspeccionId, orgId)
  const fechaSlug = datos.fecha.replaceAll('-', '')
  const ranchoSlug = slugify(datos.rancho)
  const filename = `preoperacional-${fechaSlug}-${ranchoSlug}.pdf`

  const blob = await pdf(<PreoperacionalPDF {...datos} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
