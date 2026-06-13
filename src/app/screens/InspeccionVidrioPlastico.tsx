// ╔══════════════════════════════════════════════════════════════════════╗
// ║  PATRÓN INOCUIDAD M7 — copia la estructura de M6 (BotiquinPrimerosAuxilios)  ║
// ║                                                                              ║
// ║  Diferencia clave vs M6: una inspección M7 = VARIAS filas (materiales)      ║
// ║  con el mismo rancho_id + fecha. El formulario agrega filas dinámicamente.  ║
// ╚══════════════════════════════════════════════════════════════════════╝

import { useState, useEffect } from 'react'
import { ChevronLeft, Plus, FileDown, X, Loader2, Eye, Files, AlertTriangle, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthContext } from '@/context/AuthContext'
import { useRanchos } from '@/hooks/useRanchos'
import { useVidrioPlastico, type M7Inspeccion } from '@/hooks/useVidrioPlastico'
import { supabase } from '@/lib/supabase'
import { generarVidrioPlasticoPDF } from '@/lib/pdf/m7/generarVidrioPlasticoPDF'
import { generarVidrioPlasticoConsolidadoPDF } from '@/lib/pdf/m7/generarVidrioPlasticoConsolidadoPDF'
import type { VidrioPlasticoPDFProps } from '@/lib/pdf/m7/VidrioPlasticoPDF'

// ── Constantes ───────────────────────────────────────────────────────────────

const TITULO_MODULO = 'Inspección de Vidrio y Plástico Duro'
const CLAVE_MODULO  = 'MXA-F-SC-SIG-029.14 · Quincenal'

const ESTADO_OPTIONS = ['Bueno', 'Deteriorado', 'Reemplazo'] as const
type Estado = (typeof ESTADO_OPTIONS)[number]

const ESTADO_CHIP: Record<Estado, { bg: string; text: string }> = {
  'Bueno':       { bg: 'var(--agro-success-fill)', text: 'var(--agro-success-text)' },
  'Deteriorado': { bg: 'var(--agro-warning-fill)', text: 'var(--agro-warning-text)' },
  'Reemplazo':   { bg: 'var(--agro-danger-fill)',  text: 'var(--agro-danger-text)'  },
}

const SUGERENCIAS_AREA = ['Camionetas', 'Empaque', 'Almacén', 'Baños', 'Comedor', 'Oficinas', 'Bodega', 'Área de cosecha']
const SUGERENCIAS_MATERIAL = ['Faros', 'Parabrisas', 'Ventanas', 'Lámparas', 'Termómetros', 'Pantallas', 'Espejos', 'Cristalería']

// ── Tipos ────────────────────────────────────────────────────────────────────

type MaterialFila = {
  area: string
  material_equipo: string
  protegido: boolean
  estado: Estado
  observaciones: string
}

type ErrFila = { area: boolean; material: boolean }

const filaVacia = (): MaterialFila => ({
  area: '',
  material_equipo: '',
  protegido: true,
  estado: 'Bueno',
  observaciones: '',
})

const hoy = () => new Date().toISOString().split('T')[0]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function resumirEstados(materiales: M7Inspeccion['materiales']): Partial<Record<Estado, number>> {
  const counts: Partial<Record<Estado, number>> = {}
  for (const m of materiales) {
    counts[m.estado] = (counts[m.estado] ?? 0) + 1
  }
  return counts
}

// Extrae la fecha del mensaje del trigger M7_LIMITE_QUINCENAL y arma texto amigable.
function parsearErrorLimite(mensaje: string): string {
  const fechas = mensaje.match(/\d{2}\/\d{2}\/\d{4}/g)
  const proxima = fechas ? fechas[fechas.length - 1] : null
  return proxima
    ? `Ya se registró una inspección de vidrio y plástico esta quincena. La siguiente se permite a partir del ${proxima}.`
    : 'Solo se permite una inspección de vidrio y plástico cada 14 días por rancho.'
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function MaterialFilaForm({
  fila,
  index,
  errFila,
  onChange,
  onRemove,
  puedeEliminar,
}: {
  fila: MaterialFila
  index: number
  errFila: ErrFila
  onChange: (f: MaterialFila) => void
  onRemove: () => void
  puedeEliminar: boolean
}) {
  return (
    <div className="bg-muted rounded-xl p-3 space-y-3">
      {/* Encabezado de fila */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground" style={{ fontWeight: 600 }}>
          Material {index + 1}
        </span>
        {puedeEliminar && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-muted-foreground hover:text-agro-red transition-colors"
            aria-label="Quitar material"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Área */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1" style={{ fontWeight: 600 }}>
          ÁREA *
        </label>
        <input
          type="text"
          list={`areas-${index}`}
          value={fila.area}
          onChange={(e) => onChange({ ...fila, area: e.target.value })}
          placeholder="Ej: Camionetas"
          className={`w-full h-10 px-3 rounded-lg bg-card border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
            errFila.area ? 'border-agro-red' : 'border-border'
          }`}
        />
        <datalist id={`areas-${index}`}>
          {SUGERENCIAS_AREA.map((a) => <option key={a} value={a} />)}
        </datalist>
        {errFila.area && <p className="text-xs text-agro-red mt-1">Indica el área</p>}
      </div>

      {/* Material / Equipo */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1" style={{ fontWeight: 600 }}>
          MATERIAL / EQUIPO *
        </label>
        <input
          type="text"
          list={`materiales-${index}`}
          value={fila.material_equipo}
          onChange={(e) => onChange({ ...fila, material_equipo: e.target.value })}
          placeholder="Ej: Faros"
          className={`w-full h-10 px-3 rounded-lg bg-card border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
            errFila.material ? 'border-agro-red' : 'border-border'
          }`}
        />
        <datalist id={`materiales-${index}`}>
          {SUGERENCIAS_MATERIAL.map((m) => <option key={m} value={m} />)}
        </datalist>
        {errFila.material && <p className="text-xs text-agro-red mt-1">Indica el material o equipo</p>}
      </div>

      {/* Protegido */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
          ¿PROTEGIDO?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...fila, protegido: true })}
            className={`flex-1 h-10 rounded-lg text-sm transition-colors ${
              fila.protegido
                ? 'bg-primary text-white'
                : 'bg-input-background text-muted-foreground border border-border'
            }`}
            style={{ fontWeight: 600 }}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...fila, protegido: false })}
            className={`flex-1 h-10 rounded-lg text-sm transition-colors ${
              !fila.protegido
                ? 'bg-agro-red text-white'
                : 'bg-input-background text-muted-foreground border border-border'
            }`}
            style={{ fontWeight: 600 }}
          >
            No
          </button>
        </div>
      </div>

      {/* Estado */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
          ESTADO
        </label>
        <select
          value={fila.estado}
          onChange={(e) => onChange({ ...fila, estado: e.target.value as Estado })}
          className="w-full h-10 px-3 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          {ESTADO_OPTIONS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1" style={{ fontWeight: 600 }}>
          OBSERVACIONES
        </label>
        <input
          type="text"
          value={fila.observaciones}
          onChange={(e) => onChange({ ...fila, observaciones: e.target.value })}
          placeholder="Opcional"
          className="w-full h-10 px-3 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  )
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export function InspeccionVidrioPlastico() {
  const navigate = useNavigate()
  const { profile } = useAuthContext()
  const { ranchos } = useRanchos()
  const { inspecciones, loading, refetch } = useVidrioPlastico()

  // ── Estado del formulario ───────────────────────────────────────────────
  const [sheetAbierto, setSheetAbierto] = useState(false)
  const [ranchoId, setRanchoId] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [materiales, setMateriales] = useState<MaterialFila[]>([filaVacia()])
  const [errRancho, setErrRancho] = useState(false)
  const [errFilas, setErrFilas] = useState<ErrFila[]>([{ area: false, material: false }])
  const [guardando, setGuardando] = useState(false)
  const [limiteInfo, setLimiteInfo] = useState<{ proxima: string } | null>(null)
  const [generandoPDF, setGenerandoPDF] = useState<string | null>(null)

  // ── Estado del consolidado ──────────────────────────────────────────────
  const [sheetConsolidadoAbierto, setSheetConsolidadoAbierto] = useState(false)
  const [consRanchoId, setConsRanchoId] = useState('')
  const [consDesde, setConsDesde] = useState('')
  const [consHasta, setConsHasta] = useState(hoy())
  const [generandoConsolidado, setGenerandoConsolidado] = useState(false)
  const [errConsRancho, setErrConsRancho] = useState(false)
  const [errConsFechas, setErrConsFechas] = useState(false)

  // ── Verificación proactiva del límite quincenal (14 días) ───────────────
  // Busca inspecciones previas en los 13 días anteriores a la fecha seleccionada.
  // El mismo día se permite (es la misma inspección con más materiales).
  useEffect(() => {
    if (!sheetAbierto || !ranchoId || !fecha || !profile?.org_id) {
      setLimiteInfo(null)
      return
    }
    let cancelado = false
    const fechaDate = new Date(fecha + 'T12:00:00')
    const inicio = new Date(fechaDate)
    inicio.setDate(inicio.getDate() - 13)
    const inicioStr = inicio.toISOString().split('T')[0]

    supabase
      .from('m7_vidrio_plastico')
      .select('fecha')
      .eq('org_id', profile.org_id)
      .eq('rancho_id', ranchoId)
      .gte('fecha', inicioStr)
      .lt('fecha', fecha)
      .order('fecha', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelado) return
        if (data && data.length > 0) {
          const ultimoDate = new Date(data[0].fecha + 'T12:00:00')
          const proximaDate = new Date(ultimoDate)
          proximaDate.setDate(proximaDate.getDate() + 14)
          setLimiteInfo({ proxima: formatFecha(proximaDate.toISOString().split('T')[0]) })
        } else {
          setLimiteInfo(null)
        }
      })
    return () => { cancelado = true }
  }, [sheetAbierto, ranchoId, fecha, profile?.org_id])

  // ── Opciones de rancho ──────────────────────────────────────────────────
  const ranchoOptions = ranchos.map((r) => ({ value: r.id, label: r.nombre }))

  // ── Handlers del formulario ─────────────────────────────────────────────

  function abrirSheet() {
    setRanchoId('')
    setFecha(hoy())
    setMateriales([filaVacia()])
    setErrRancho(false)
    setErrFilas([{ area: false, material: false }])
    setLimiteInfo(null)
    setSheetAbierto(true)
  }

  function agregarFila() {
    setMateriales((prev) => [...prev, filaVacia()])
    setErrFilas((prev) => [...prev, { area: false, material: false }])
  }

  function quitarFila(i: number) {
    setMateriales((prev) => prev.filter((_, j) => j !== i))
    setErrFilas((prev) => prev.filter((_, j) => j !== i))
  }

  function updateFila(i: number, f: MaterialFila) {
    setMateriales((prev) => prev.map((x, j) => (j === i ? f : x)))
    setErrFilas((prev) =>
      prev.map((e, j) =>
        j === i
          ? { area: f.area.trim() ? false : e.area, material: f.material_equipo.trim() ? false : e.material }
          : e
      )
    )
  }

  async function handleGuardar() {
    let hayError = false
    if (!ranchoId) { setErrRancho(true); hayError = true }

    const nuevosErrFilas = materiales.map((m) => ({
      area: !m.area.trim(),
      material: !m.material_equipo.trim(),
    }))
    setErrFilas(nuevosErrFilas)
    if (nuevosErrFilas.some((e) => e.area || e.material)) hayError = true

    if (hayError) return
    if (!profile?.org_id) { toast.error('Sin organización activa'); return }

    setGuardando(true)
    try {
      const rows = materiales.map((m) => ({
        rancho_id: ranchoId,
        org_id: profile.org_id,
        fecha,
        registrado_por: profile.id,
        area: m.area.trim(),
        material_equipo: m.material_equipo.trim(),
        protegido: m.protegido,
        estado: m.estado,
        observaciones: m.observaciones.trim() || null,
      }))

      const { data, error } = await supabase
        .from('m7_vidrio_plastico')
        .insert(rows)
        .select('id')

      if (error) throw error

      toast.success('Inspección guardada')
      setSheetAbierto(false)
      await refetch()

      // Generar PDF automáticamente tras guardar
      const rancho = ranchos.find((r) => r.id === ranchoId)
      if (rancho) {
        const folio = (data?.[0]?.id as string)?.slice(0, 8).toUpperCase() ?? '—'
        const pdfProps: VidrioPlasticoPDFProps = {
          folio,
          rancho: rancho.nombre,
          ranchoCodigo: rancho.codigo,
          fecha,
          responsableNombre: profile.nombre_completo,
          materiales: materiales.map((m) => ({
            area: m.area.trim(),
            material_equipo: m.material_equipo.trim(),
            protegido: m.protegido,
            estado: m.estado,
            observaciones: m.observaciones.trim() || null,
          })),
        }
        try {
          await generarVidrioPlasticoPDF(pdfProps, rancho.nombre, fecha)
        } catch {
          toast.warning('Inspección guardada — el PDF no se pudo generar. Descárgalo desde el historial.')
        }
      }
    } catch (err: unknown) {
      const mensaje = (err instanceof Error ? err.message : (err as any)?.message) ?? ''
      if (mensaje.includes('M7_LIMITE_QUINCENAL')) {
        toast.warning(parsearErrorLimite(mensaje), { duration: 7000 })
      } else {
        toast.error(mensaje || 'No se pudo guardar la inspección')
      }
    } finally {
      setGuardando(false)
    }
  }

  async function handleDescargarPDF(insp: M7Inspeccion) {
    const key = `${insp.rancho_id}|${insp.fecha}`
    setGenerandoPDF(key)
    try {
      const folio = insp.materiales[0]?.id.slice(0, 8).toUpperCase() ?? '—'
      const pdfProps: VidrioPlasticoPDFProps = {
        folio,
        rancho: insp.rancho_nombre,
        ranchoCodigo: insp.rancho_codigo,
        fecha: insp.fecha,
        responsableNombre: profile?.nombre_completo ?? 'Responsable',
        materiales: insp.materiales.map((m) => ({
          area: m.area,
          material_equipo: m.material_equipo,
          protegido: m.protegido,
          estado: m.estado,
          observaciones: m.observaciones,
        })),
      }
      await generarVidrioPlasticoPDF(pdfProps, insp.rancho_nombre, insp.fecha)
    } catch {
      toast.error('No se pudo generar el PDF')
    } finally {
      setGenerandoPDF(null)
    }
  }

  async function handleGenerarConsolidado() {
    let valido = true
    if (!consRanchoId) { setErrConsRancho(true); valido = false }
    if (!consDesde || !consHasta) { setErrConsFechas(true); valido = false }
    if (!valido) return
    if (!profile?.org_id) { toast.error('Sin organización activa'); return }

    setGenerandoConsolidado(true)
    try {
      const { data, error } = await supabase
        .from('m7_vidrio_plastico')
        .select('*, ranchos(nombre, codigo)')
        .eq('org_id', profile.org_id)
        .eq('rancho_id', consRanchoId)
        .gte('fecha', consDesde)
        .lte('fecha', consHasta)
        .order('fecha', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      if (!data || data.length === 0) {
        toast.warning('No hay registros en ese rango de fechas para el rancho seleccionado')
        return
      }

      const rancho = ranchos.find((r) => r.id === consRanchoId)
      const ranchoNombre = rancho?.nombre ?? 'Rancho'

      // Agrupar por fecha para armar una página por inspección
      const grouped = new Map<string, VidrioPlasticoPDFProps>()
      for (const row of data as any[]) {
        if (!grouped.has(row.fecha)) {
          grouped.set(row.fecha, {
            folio: (row.id as string).slice(0, 8).toUpperCase(),
            rancho: row.ranchos?.nombre ?? ranchoNombre,
            ranchoCodigo: row.ranchos?.codigo ?? rancho?.codigo ?? '—',
            fecha: row.fecha,
            responsableNombre: profile.nombre_completo,
            materiales: [],
          })
        }
        grouped.get(row.fecha)!.materiales.push({
          area: row.area,
          material_equipo: row.material_equipo,
          protegido: row.protegido,
          estado: row.estado,
          observaciones: row.observaciones,
        })
      }

      const inspeccionesList = Array.from(grouped.values())
      await generarVidrioPlasticoConsolidadoPDF(inspeccionesList, ranchoNombre, consDesde, consHasta)
      setSheetConsolidadoAbierto(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el PDF consolidado')
    } finally {
      setGenerandoConsolidado(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full pb-[calc(72px+34px)]">

      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1 text-muted-foreground flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-foreground truncate" style={{ fontWeight: 600 }}>
              {TITULO_MODULO}
            </h1>
            <p className="text-xs text-muted-foreground">{CLAVE_MODULO}</p>
          </div>
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-primary" />
          </div>
        </div>
      </header>

      {/* Acción consolidado */}
      <div className="px-4 pt-3">
        <button
          onClick={() => {
            setConsRanchoId('')
            setConsDesde('')
            setConsHasta(hoy())
            setErrConsRancho(false)
            setErrConsFechas(false)
            setSheetConsolidadoAbierto(true)
          }}
          className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-primary text-primary text-sm hover:bg-primary/5 transition-colors"
          style={{ fontWeight: 600 }}
        >
          <Files className="w-4 h-4" />
          Exportar consolidado
        </button>
      </div>

      {/* Historial */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : inspecciones.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <Eye className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin inspecciones aún</p>
            <p className="text-xs text-muted-foreground mt-1">
              Toca + para registrar la primera inspección
            </p>
          </div>
        ) : (
          inspecciones.map((insp) => {
            const key = `${insp.rancho_id}|${insp.fecha}`
            const estadoResumen = resumirEstados(insp.materiales)
            return (
              <div key={key} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-sm text-foreground truncate"
                        style={{ fontWeight: 600 }}
                      >
                        {insp.rancho_nombre}
                      </span>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0"
                        style={{ fontWeight: 600 }}
                      >
                        {insp.materiales.length} materiales
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFecha(insp.fecha)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDescargarPDF(insp)}
                    disabled={generandoPDF === key}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors flex-shrink-0 disabled:opacity-50"
                    title="Descargar PDF"
                  >
                    {generandoPDF === key ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Chips de estado */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(Object.entries(estadoResumen) as [Estado, number][]).map(([estado, count]) => (
                    <span
                      key={estado}
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: ESTADO_CHIP[estado].bg,
                        color: ESTADO_CHIP[estado].text,
                        fontWeight: 600,
                      }}
                    >
                      {estado}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-[calc(72px+34px+16px)] left-1/2 -translate-x-1/2 w-full max-w-[390px] flex justify-end px-4 pointer-events-none z-10">
        <button
          onClick={abrirSheet}
          className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg pointer-events-auto hover:bg-agro-blue transition-colors"
          aria-label="Nueva inspección"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* ── Bottom Sheet — exportar consolidado ─────────────────────────────── */}
      {sheetConsolidadoAbierto && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setSheetConsolidadoAbierto(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-40 bg-card flex flex-col"
            style={{ borderRadius: '0.625rem 0.625rem 0 0', maxWidth: 390, margin: '0 auto' }}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <h2 className="text-base text-foreground" style={{ fontWeight: 600 }}>
                Exportar consolidado
              </h2>
              <button onClick={() => setSheetConsolidadoAbierto(false)} className="p-1">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              {/* Rancho */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  RANCHO *
                </label>
                <select
                  value={consRanchoId}
                  onChange={(e) => { setConsRanchoId(e.target.value); setErrConsRancho(false) }}
                  className={`w-full h-11 px-3 rounded-lg bg-input-background border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
                    errConsRancho ? 'border-agro-red' : 'border-border'
                  } ${!consRanchoId ? 'text-muted-foreground' : 'text-foreground'}`}
                >
                  <option value="" disabled>Seleccionar rancho</option>
                  {ranchoOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {errConsRancho && <p className="text-xs text-agro-red mt-1">Selecciona un rancho</p>}
              </div>

              {/* Desde */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  DESDE *
                </label>
                <input
                  type="date"
                  value={consDesde}
                  onChange={(e) => { setConsDesde(e.target.value); setErrConsFechas(false) }}
                  className={`w-full h-11 px-3 rounded-lg bg-input-background border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
                    errConsFechas && !consDesde ? 'border-agro-red' : 'border-border'
                  }`}
                />
              </div>

              {/* Hasta */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  HASTA *
                </label>
                <input
                  type="date"
                  value={consHasta}
                  onChange={(e) => { setConsHasta(e.target.value); setErrConsFechas(false) }}
                  className={`w-full h-11 px-3 rounded-lg bg-input-background border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
                    errConsFechas && !consHasta ? 'border-agro-red' : 'border-border'
                  }`}
                />
                {errConsFechas && <p className="text-xs text-agro-red mt-1">Indica el rango de fechas</p>}
              </div>
            </div>

            <div className="p-4 border-t border-border flex-shrink-0">
              <button
                onClick={handleGenerarConsolidado}
                disabled={generandoConsolidado}
                className="w-full h-14 bg-primary text-white rounded-3xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-agro-blue transition-colors"
                style={{ fontWeight: 600 }}
              >
                {generandoConsolidado && <Loader2 className="w-4 h-4 animate-spin" />}
                Generar PDF consolidado
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Bottom Sheet — formulario nueva inspección ───────────────────────── */}
      {sheetAbierto && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setSheetAbierto(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-40 bg-card flex flex-col"
            style={{
              height: '85%',
              borderRadius: '0.625rem 0.625rem 0 0',
              maxWidth: 390,
              margin: '0 auto',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header sheet */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <h2 className="text-base text-foreground" style={{ fontWeight: 600 }}>
                Nueva inspección
              </h2>
              <button onClick={() => setSheetAbierto(false)} className="p-1">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Campos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Rancho */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  RANCHO *
                </label>
                <select
                  value={ranchoId}
                  onChange={(e) => { setRanchoId(e.target.value); setErrRancho(false) }}
                  className={`w-full h-11 px-3 rounded-lg bg-input-background border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
                    errRancho ? 'border-agro-red' : 'border-border'
                  } ${!ranchoId ? 'text-muted-foreground' : 'text-foreground'}`}
                >
                  <option value="" disabled>Seleccionar rancho</option>
                  {ranchoOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {errRancho && <p className="text-xs text-agro-red mt-1">Selecciona un rancho</p>}
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  FECHA DE INSPECCIÓN *
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Aviso límite quincenal */}
              {limiteInfo && (
                <div
                  className="flex items-start gap-2 rounded-xl p-3"
                  style={{ backgroundColor: 'var(--agro-warning-fill)', border: '1px solid #F5A623' }}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--agro-warning-text)' }} />
                  <p className="text-xs" style={{ color: 'var(--agro-warning-text)' }}>
                    Ya existe una inspección para este rancho en los últimos 14 días.{' '}
                    Próxima inspección disponible:{' '}
                    <span style={{ fontWeight: 600 }}>{limiteInfo.proxima}</span>
                  </p>
                </div>
              )}

              {/* Lista dinámica de materiales */}
              <div>
                <label className="block text-xs text-muted-foreground mb-2" style={{ fontWeight: 600 }}>
                  MATERIALES A INSPECCIONAR
                </label>
                <div className="space-y-3">
                  {materiales.map((fila, i) => (
                    <MaterialFilaForm
                      key={i}
                      fila={fila}
                      index={i}
                      errFila={errFilas[i] ?? { area: false, material: false }}
                      onChange={(f) => updateFila(i, f)}
                      onRemove={() => quitarFila(i)}
                      puedeEliminar={materiales.length > 1}
                    />
                  ))}
                </div>

                {/* Botón agregar material */}
                <button
                  type="button"
                  onClick={agregarFila}
                  className="w-full h-11 mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary text-primary text-sm hover:bg-primary/5 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  <Plus className="w-4 h-4" />
                  Agregar material
                </button>
              </div>

              {/* Responsable (read-only) */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  REGISTRADO POR
                </label>
                <div className="h-11 px-3 rounded-lg bg-muted border border-border flex items-center">
                  <span className="text-sm text-muted-foreground">
                    {profile?.nombre_completo ?? '—'}
                  </span>
                </div>
              </div>

            </div>

            {/* Guardar */}
            <div className="p-4 border-t border-border flex-shrink-0">
              <button
                onClick={handleGuardar}
                disabled={guardando || !!limiteInfo}
                className="w-full h-14 bg-primary text-white rounded-3xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-agro-blue transition-colors"
                style={{ fontWeight: 600 }}
              >
                {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar y generar PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
