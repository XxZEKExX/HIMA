import { useState, useEffect } from 'react'
import {
  ChevronLeft, Plus, FileDown, X, Loader2, ClipboardCheck, Files,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthContext } from '@/context/AuthContext'
import { useRanchos } from '@/hooks/useRanchos'
import { useM11Preoperacional, type M11InspeccionResumen } from '@/hooks/useM11Preoperacional'
import { supabase } from '@/lib/supabase'
import { generarPreoperacionalPDF } from '@/lib/pdf/m11/generarPreoperacionalPDF'
import { generarPreoperacionalConsolidadoPDF } from '@/lib/pdf/m11/generarPreoperacionalConsolidadoPDF'

// ── Constantes ────────────────────────────────────────────────────────────────

const TITULO_MODULO = 'Inspección Preoperacional'
const CLAVE_MODULO  = 'MXA-F-SC-SIG · Por evento de cosecha'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Valor = 'SI' | 'NO' | 'NA'

interface ItemCatalogo {
  id: string
  seccion_label: string
  item: string
  default_valor: Valor
}

interface ItemState {
  valor: Valor
  codigoCorrectivo: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const hoy = () => new Date().toISOString().split('T')[0]

function formatFecha(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return iso }
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function ValorToggle({
  valor,
  onChange,
}: {
  valor: Valor
  onChange: (v: Valor) => void
}) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
      {(['SI', 'NO', 'NA'] as Valor[]).map((op) => (
        <button
          key={op}
          type="button"
          onClick={() => onChange(op)}
          className={`px-2.5 py-1 text-[11px] transition-colors ${
            valor === op
              ? op === 'SI'
                ? 'bg-agro-success-fill text-agro-success-text'
                : op === 'NO'
                ? 'bg-agro-danger-fill text-agro-danger-text'
                : 'bg-muted text-muted-foreground'
              : 'bg-card text-muted-foreground hover:bg-muted'
          }`}
          style={{ fontWeight: valor === op ? 700 : 400 }}
        >
          {op}
        </button>
      ))}
    </div>
  )
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export function InspeccionPreoperacionalCosecha() {
  const navigate = useNavigate()
  const { profile } = useAuthContext()
  const { ranchos } = useRanchos()
  const { inspecciones, loading, refetch } = useM11Preoperacional()

  // Catálogo cargado una vez al montar
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>([])
  const [cargandoCat, setCargandoCat] = useState(true)

  useEffect(() => {
    supabase
      .from('m11_items_catalogo')
      .select('id, seccion_label, item, default_valor')
      .order('orden')
      .then(({ data }) => {
        setCatalogo((data ?? []) as ItemCatalogo[])
        setCargandoCat(false)
      })
  }, [])

  // ── Form ────────────────────────────────────────────────────────────────────

  const [sheetAbierto, setSheetAbierto] = useState(false)
  const [ranchoId, setRanchoId]             = useState('')
  const [fecha, setFecha]                   = useState(hoy())
  const [realizadoPorNombre, setRealizadoPorNombre] = useState('')
  const [observaciones, setObservaciones]   = useState('')
  const [itemStates, setItemStates]         = useState<Record<string, ItemState>>({})
  const [guardando, setGuardando]           = useState(false)
  const [errRancho, setErrRancho]           = useState(false)

  function abrirSheet() {
    // Inicializar todos los ítems con su default_valor
    const initial: Record<string, ItemState> = {}
    for (const item of catalogo) {
      initial[item.id] = { valor: item.default_valor, codigoCorrectivo: '' }
    }
    setItemStates(initial)
    setRanchoId('')
    setFecha(hoy())
    setRealizadoPorNombre(profile?.nombre_completo ?? '')
    setObservaciones('')
    setErrRancho(false)
    setSheetAbierto(true)
  }

  function setValor(itemId: string, valor: Valor) {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        valor,
        codigoCorrectivo: valor !== 'NO' ? '' : prev[itemId]?.codigoCorrectivo ?? '',
      },
    }))
  }

  function setCodigo(itemId: string, codigo: string) {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], codigoCorrectivo: codigo },
    }))
  }

  // ── Guardar ─────────────────────────────────────────────────────────────────

  async function handleGuardar() {
    if (!ranchoId) { setErrRancho(true); return }
    if (!profile?.org_id) { toast.error('Sin organización activa'); return }

    setGuardando(true)
    try {
      // 1. INSERT cabecera
      const { data: insp, error: errInsp } = await supabase
        .from('m11_inspeccion')
        .insert({
          rancho_id: ranchoId,
          org_id: profile.org_id,
          fecha,
          realizado_por_nombre: realizadoPorNombre.trim() || null,
          realizado_por_id: profile.id,
          observaciones: observaciones.trim() || null,
        })
        .select('id')
        .single()
      if (errInsp) throw errInsp

      // 2. Batch INSERT de los 48 resultados
      const rows = catalogo.map((cat) => {
        const state = itemStates[cat.id]
        return {
          inspeccion_id: (insp as any).id,
          item_id: cat.id,
          org_id: profile.org_id,
          valor: state?.valor ?? cat.default_valor,
          codigo_correctivo: state?.codigoCorrectivo?.trim() || null,
        }
      })
      const { error: errRes } = await supabase.from('m11_resultados').insert(rows)
      if (errRes) throw errRes

      toast.success('Inspección guardada')
      setSheetAbierto(false)
      await refetch()

      // PDF automático
      try {
        await generarPreoperacionalPDF((insp as any).id, profile.org_id)
      } catch {
        toast.warning('Inspección guardada — el PDF no se pudo generar. Descárgalo desde el historial.')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la inspección')
    } finally {
      setGuardando(false)
    }
  }

  // ── Descargar PDF ────────────────────────────────────────────────────────────

  const [generandoPDF, setGenerandoPDF] = useState<string | null>(null)

  async function handleDescargarPDF(inspeccion: M11InspeccionResumen) {
    if (!profile?.org_id) return
    setGenerandoPDF(inspeccion.id)
    try {
      await generarPreoperacionalPDF(inspeccion.id, profile.org_id)
    } catch {
      toast.error('No se pudo generar el PDF')
    } finally {
      setGenerandoPDF(null)
    }
  }

  // ── Consolidado ──────────────────────────────────────────────────────────────

  const [sheetConsAbierto, setSheetConsAbierto] = useState(false)
  const [consRanchoId, setConsRanchoId] = useState('')
  const [consDesde, setConsDesde]       = useState('')
  const [consHasta, setConsHasta]       = useState(hoy())
  const [generandoCons, setGenerandoCons] = useState(false)
  const [errConsRancho, setErrConsRancho] = useState(false)
  const [errConsFechas, setErrConsFechas] = useState(false)

  async function handleGenerarConsolidado() {
    let valido = true
    if (!consRanchoId) { setErrConsRancho(true); valido = false }
    if (!consDesde || !consHasta) { setErrConsFechas(true); valido = false }
    if (!valido) return
    if (!profile?.org_id) { toast.error('Sin organización activa'); return }

    setGenerandoCons(true)
    try {
      const rancho = ranchos.find((r) => r.id === consRanchoId)
      await generarPreoperacionalConsolidadoPDF(
        consRanchoId,
        rancho?.nombre ?? 'Rancho',
        profile.org_id,
        consDesde,
        consHasta,
      )
      setSheetConsAbierto(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el PDF consolidado')
    } finally {
      setGenerandoCons(false)
    }
  }

  // ── Secciones del catálogo agrupadas ────────────────────────────────────────

  const secciones: { label: string; items: ItemCatalogo[] }[] = []
  for (const item of catalogo) {
    const last = secciones[secciones.length - 1]
    if (!last || last.label !== item.seccion_label) {
      secciones.push({ label: item.seccion_label, items: [item] })
    } else {
      last.items.push(item)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full pb-[calc(72px+34px)]">

      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1 text-muted-foreground flex-shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-foreground truncate" style={{ fontWeight: 600 }}>
              {TITULO_MODULO}
            </h1>
            <p className="text-xs text-muted-foreground">{CLAVE_MODULO}</p>
          </div>
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
        </div>
      </header>

      {/* Exportar consolidado */}
      <div className="px-4 pt-3">
        <button
          onClick={() => {
            setConsRanchoId('')
            setConsDesde('')
            setConsHasta(hoy())
            setErrConsRancho(false)
            setErrConsFechas(false)
            setSheetConsAbierto(true)
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
            <ClipboardCheck className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin inspecciones aún</p>
            <p className="text-xs text-muted-foreground mt-1">
              Toca + para registrar la primera inspección preoperacional
            </p>
          </div>
        ) : (
          inspecciones.map((insp) => (
            <div key={insp.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate" style={{ fontWeight: 600 }}>
                    {insp.rancho_nombre}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatFecha(insp.fecha)}
                  </p>
                  {insp.realizado_por_nombre && (
                    <p className="text-xs text-muted-foreground">
                      Realizó: {insp.realizado_por_nombre}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDescargarPDF(insp)}
                  disabled={generandoPDF === insp.id}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors flex-shrink-0 disabled:opacity-50"
                  title="Descargar PDF"
                >
                  {generandoPDF === insp.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-[calc(72px+34px+16px)] left-1/2 -translate-x-1/2 w-full max-w-[390px] flex justify-end px-4 pointer-events-none z-10">
        <button
          onClick={abrirSheet}
          disabled={cargandoCat}
          className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg pointer-events-auto hover:bg-agro-blue transition-colors disabled:opacity-50"
          aria-label="Nueva inspección"
        >
          {cargandoCat ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* ── Bottom Sheet — Consolidado ──────────────────────────────────────── */}
      {sheetConsAbierto && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setSheetConsAbierto(false)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-40 bg-card flex flex-col"
            style={{ borderRadius: '0.625rem 0.625rem 0 0', maxWidth: 390, margin: '0 auto' }}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <h2 className="text-base text-foreground" style={{ fontWeight: 600 }}>Exportar consolidado</h2>
              <button onClick={() => setSheetConsAbierto(false)} className="p-1">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>RANCHO *</label>
                <select
                  value={consRanchoId}
                  onChange={(e) => { setConsRanchoId(e.target.value); setErrConsRancho(false) }}
                  className={`w-full h-11 px-3 rounded-lg bg-input-background border text-sm focus:outline-none focus:border-primary ${errConsRancho ? 'border-agro-red' : 'border-border'} ${!consRanchoId ? 'text-muted-foreground' : 'text-foreground'}`}
                >
                  <option value="" disabled>Seleccionar rancho</option>
                  {ranchos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
                {errConsRancho && <p className="text-xs text-agro-red mt-1">Selecciona un rancho</p>}
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>DESDE *</label>
                <input type="date" value={consDesde}
                  onChange={(e) => { setConsDesde(e.target.value); setErrConsFechas(false) }}
                  className={`w-full h-11 px-3 rounded-lg bg-input-background border text-sm text-foreground focus:outline-none focus:border-primary ${errConsFechas && !consDesde ? 'border-agro-red' : 'border-border'}`}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>HASTA *</label>
                <input type="date" value={consHasta}
                  onChange={(e) => { setConsHasta(e.target.value); setErrConsFechas(false) }}
                  className={`w-full h-11 px-3 rounded-lg bg-input-background border text-sm text-foreground focus:outline-none focus:border-primary ${errConsFechas && !consHasta ? 'border-agro-red' : 'border-border'}`}
                />
                {errConsFechas && <p className="text-xs text-agro-red mt-1">Indica el rango de fechas</p>}
              </div>
            </div>
            <div className="p-4 border-t border-border flex-shrink-0">
              <button
                onClick={handleGenerarConsolidado}
                disabled={generandoCons}
                className="w-full h-14 bg-primary text-white rounded-3xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-agro-blue transition-colors"
                style={{ fontWeight: 600 }}
              >
                {generandoCons && <Loader2 className="w-4 h-4 animate-spin" />}
                Generar PDF consolidado
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Bottom Sheet — Formulario ────────────────────────────────────────── */}
      {sheetAbierto && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setSheetAbierto(false)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-40 bg-card flex flex-col"
            style={{
              height: '92%',
              borderRadius: '0.625rem 0.625rem 0 0',
              maxWidth: 390,
              margin: '0 auto',
            }}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <h2 className="text-base text-foreground" style={{ fontWeight: 600 }}>
                Nueva inspección preoperacional
              </h2>
              <button onClick={() => setSheetAbierto(false)} className="p-1">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

              {/* Rancho */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  RANCHO *
                </label>
                <select
                  value={ranchoId}
                  onChange={(e) => { setRanchoId(e.target.value); setErrRancho(false) }}
                  className={`w-full h-11 px-3 rounded-lg bg-input-background border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${errRancho ? 'border-agro-red' : 'border-border'} ${!ranchoId ? 'text-muted-foreground' : 'text-foreground'}`}
                >
                  <option value="" disabled>Seleccionar rancho</option>
                  {ranchos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
                {errRancho && <p className="text-xs text-agro-red mt-1">Selecciona un rancho</p>}
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  FECHA *
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Realizó */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  REALIZÓ LA INSPECCIÓN
                </label>
                <input
                  type="text"
                  value={realizadoPorNombre}
                  onChange={(e) => setRealizadoPorNombre(e.target.value)}
                  placeholder="Nombre e iniciales"
                  className="w-full h-11 px-3 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Puntos de inspección por sección */}
              {secciones.map((sec) => (
                <div key={sec.label}>
                  <div
                    className="px-3 py-2 rounded-lg mb-2"
                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  >
                    <span className="text-xs" style={{ fontWeight: 700 }}>{sec.label}</span>
                  </div>
                  <div className="space-y-2">
                    {sec.items.map((item) => {
                      const state = itemStates[item.id] ?? { valor: item.default_valor, codigoCorrectivo: '' }
                      return (
                        <div key={item.id} className="bg-muted rounded-lg px-3 py-2.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-foreground flex-1 leading-snug">
                              {item.item}
                            </span>
                            <ValorToggle
                              valor={state.valor}
                              onChange={(v) => setValor(item.id, v)}
                            />
                          </div>
                          {state.valor === 'NO' && (
                            <input
                              type="text"
                              value={state.codigoCorrectivo}
                              onChange={(e) => setCodigo(item.id, e.target.value)}
                              placeholder="Código correctivo (opcional)"
                              className="w-full h-8 px-2 rounded-md bg-card border border-agro-red/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-agro-red"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Observaciones */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  OBSERVACIONES GENERALES
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones adicionales (opcional)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 pb-6 pt-4 border-t border-border flex-shrink-0">
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="w-full h-14 bg-primary text-white rounded-3xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-agro-blue transition-colors"
                style={{ fontWeight: 600 }}
              >
                {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar inspección
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
