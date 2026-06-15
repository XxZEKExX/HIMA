// PATRÓN INOCUIDAD — PDF M9
// PerimetralPagina: una página A4 landscape por mes (reutilizable).
// PerimetralPDF:    documento individual (1 mes).
// PerimetralConsolidadoPDF: documento multi-página, uno por mes.

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ItemPDFRow {
  id: string
  seccion_label: string
  item: string
}

export interface PerimetralPaginaProps {
  rancho: string
  ranchoCodigo: string
  mesLabel: string          // "Junio 2026"
  responsable: string
  tieneAlmacen: boolean
  items: ItemPDFRow[]       // ya filtrados por es_almacen si corresponde
  dias: string[]            // ["2026-06-05", "2026-06-12", ...]  sorted
  // dia_fecha → item_id → "Si" | "No"
  matriz: Record<string, Record<string, string>>
  observaciones: string | null
  otro: string | null
}

export interface PerimetralConsolidadoPDFProps {
  paginas: PerimetralPaginaProps[]
  ranchoNombre: string
  desde: string
  hasta: string
}

// ── Paleta ────────────────────────────────────────────────────────────────────

const PRIMARY  = '#2B7AB5'
const DARK     = '#1A1A1A'
const BORDER   = '#CCCCCC'
const WHITE    = '#FFFFFF'
const MUTED    = '#717182'
const ROW_ALT  = '#F5F9FE'
const SI_COLOR = '#0D5A8F'
const NO_COLOR = '#C02A2A'
const HDR_BG   = '#E8F1F9'

// ── Medidas fijas ─────────────────────────────────────────────────────────────

// A4 landscape: 841.89 × 595.28 — con márgenes 30pt cada lado
const MARGIN      = 30
const PAGE_W      = 841.89 - MARGIN * 2   // ~781.89
const ITEM_COL_W  = 190                    // ancho columna de sub-ítems
const DAY_AREA_W  = PAGE_W - ITEM_COL_W   // ~591.89

function dayColW(numDias: number): number {
  return Math.min(80, Math.floor(DAY_AREA_W / Math.max(numDias, 1)))
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: DARK,
    paddingTop: MARGIN,
    paddingBottom: MARGIN,
    paddingLeft: MARGIN,
    paddingRight: MARGIN,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
    paddingBottom: 6,
  },
  headerLogo:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  headerLogoSub: { fontSize: 6, color: MUTED, marginTop: 2 },
  headerTitle:   { flex: 1, textAlign: 'center', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  headerMeta:    { width: 90, fontSize: 6, textAlign: 'right', color: MUTED },

  // Info chips
  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 5,
    paddingRight: 5,
  },
  infoLabel: { fontSize: 6, color: MUTED, marginBottom: 1 },
  infoValue: { fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // Sección header de la tabla (banda azul)
  seccionBand: {
    backgroundColor: PRIMARY,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 4,
    flexDirection: 'row',
  },
  seccionText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: WHITE, flex: 1 },

  // Columna header de días
  dayHeader: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: HDR_BG,
    paddingTop: 3,
    paddingBottom: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: PRIMARY },

  // Item header column
  itemColHeader: {
    width: ITEM_COL_W,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: HDR_BG,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 4,
  },
  itemColHeaderText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: DARK },

  // Data row
  dataRow: { flexDirection: 'row' },
  itemCell: {
    width: ITEM_COL_W,
    borderWidth: 1,
    borderColor: BORDER,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 4,
    justifyContent: 'center',
  },
  itemText: { fontSize: 7 },
  valueCell: {
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 3,
    paddingBottom: 3,
  },

  // Footer
  footerSep: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 8, paddingTop: 5 },
  footerRow:  { flexDirection: 'row', gap: 10, marginBottom: 4 },
  footerLabel:{ fontSize: 6, color: MUTED },
  footerValue:{ fontSize: 7 },
  firmaBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 20,
    alignItems: 'center',
  },
  firmaLabel: { fontSize: 7, color: MUTED },

  // Pie de página
  piePagina: { position: 'absolute', bottom: 12, left: MARGIN, right: MARGIN, textAlign: 'center', fontSize: 6, color: MUTED },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFechaCorta(iso: string): string {
  try {
    const d = new Date(iso + 'T12:00:00')
    return `${d.getDate()} ${d.toLocaleDateString('es-MX', { month: 'short' })}`
  } catch { return iso }
}

function agruparItemsPorSeccion(items: ItemPDFRow[]) {
  const grupos: { label: string; items: ItemPDFRow[] }[] = []
  let actual: { label: string; items: ItemPDFRow[] } | null = null
  for (const item of items) {
    if (!actual || actual.label !== item.seccion_label) {
      actual = { label: item.seccion_label, items: [] }
      grupos.push(actual)
    }
    actual.items.push(item)
  }
  return grupos
}

// ── Componente de página ──────────────────────────────────────────────────────

export function PerimetralPagina({
  rancho, ranchoCodigo, mesLabel, responsable,
  tieneAlmacen, items, dias, matriz,
  observaciones, otro,
}: PerimetralPaginaProps) {
  const secciones = agruparItemsPorSeccion(items)
  const dW = dayColW(dias.length)

  return (
    <Page size="A4" orientation="landscape" style={s.page}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerLogo}>AgroCampo</Text>
          <Text style={s.headerLogoSub}>DuoMind Solutions &amp; Hima</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle}>MONITOREO PERIMETRAL DE PLAGAS</Text>
          <Text style={{ fontSize: 6, color: MUTED, marginTop: 2 }}>
            Clave: MXA-F-SC-SIG-M9  |  Frecuencia: Semanal  |  Mes: {mesLabel}
          </Text>
        </View>
        <View style={s.headerMeta}>
          <Text>Almacen: {tieneAlmacen ? 'Si' : 'No'}</Text>
        </View>
      </View>

      {/* ── Info chips ─────────────────────────────────────────────────── */}
      <View style={s.infoRow}>
        <View style={s.infoBox}>
          <Text style={s.infoLabel}>Rancho / Huerto</Text>
          <Text style={s.infoValue}>{rancho}</Text>
        </View>
        <View style={s.infoBox}>
          <Text style={s.infoLabel}>Codigo</Text>
          <Text style={s.infoValue}>{ranchoCodigo}</Text>
        </View>
        <View style={s.infoBox}>
          <Text style={s.infoLabel}>Mes de Inspeccion</Text>
          <Text style={s.infoValue}>{mesLabel}</Text>
        </View>
        <View style={s.infoBox}>
          <Text style={s.infoLabel}>Responsable de Inocuidad</Text>
          <Text style={s.infoValue}>{responsable}</Text>
        </View>
        <View style={s.infoBox}>
          <Text style={s.infoLabel}>Dias inspeccionados</Text>
          <Text style={s.infoValue}>{dias.length}</Text>
        </View>
      </View>

      {/* ── Tabla matriz ───────────────────────────────────────────────── */}

      {/* Fila header de columnas */}
      {dias.length > 0 && (
        <View style={{ flexDirection: 'row', marginBottom: 0 }}>
          <View style={s.itemColHeader}>
            <Text style={s.itemColHeaderText}>Sub-item de inspeccion</Text>
          </View>
          {dias.map((fecha) => (
            <View key={fecha} style={[s.dayHeader, { width: dW }]}>
              <Text style={s.dayHeaderText}>{formatFechaCorta(fecha)}</Text>
            </View>
          ))}
        </View>
      )}

      {dias.length === 0 && (
        <View style={{ padding: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 8, color: MUTED }}>Sin dias de inspeccion registrados.</Text>
        </View>
      )}

      {/* Secciones + ítems */}
      {secciones.map((sec) => (
        <View key={sec.label}>
          {/* Banda de sección */}
          <View style={s.seccionBand}>
            <Text style={s.seccionText}>{sec.label}</Text>
          </View>

          {/* Filas de ítems */}
          {sec.items.map((item, idx) => {
            const bg = idx % 2 === 0 ? WHITE : ROW_ALT
            return (
              <View key={item.id} style={[s.dataRow, { backgroundColor: bg }]}>
                <View style={[s.itemCell, { backgroundColor: bg }]}>
                  <Text style={s.itemText}>{item.item}</Text>
                </View>
                {dias.map((fecha) => {
                  const val = matriz[fecha]?.[item.id] ?? 'No'
                  const color = val === 'Si' ? SI_COLOR : NO_COLOR
                  return (
                    <View key={fecha} style={[s.valueCell, { width: dW, backgroundColor: bg }]}>
                      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color }}>{val}</Text>
                    </View>
                  )
                })}
              </View>
            )
          })}
        </View>
      ))}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <View style={s.footerSep}>
        <View style={s.footerRow}>
          {observaciones ? (
            <View style={{ flex: 1 }}>
              <Text style={s.footerLabel}>Observaciones:</Text>
              <Text style={s.footerValue}>{observaciones}</Text>
            </View>
          ) : null}
          {otro ? (
            <View style={{ flex: 1 }}>
              <Text style={s.footerLabel}>Otro:</Text>
              <Text style={s.footerValue}>{otro}</Text>
            </View>
          ) : null}
          {!observaciones && !otro && (
            <Text style={{ fontSize: 7, color: MUTED }}>Sin observaciones adicionales.</Text>
          )}
        </View>
        <View style={s.firmaBox}>
          <Text style={s.firmaLabel}>Firma del Responsable de Inocuidad: {responsable}</Text>
        </View>
      </View>

      {/* Pie */}
      <Text style={s.piePagina} fixed>AgroCampo — DuoMind Solutions &amp; Hima</Text>
    </Page>
  )
}

// ── PDF individual (un mes) ───────────────────────────────────────────────────

export function PerimetralPDF(props: PerimetralPaginaProps) {
  return (
    <Document>
      <PerimetralPagina {...props} />
    </Document>
  )
}

// ── PDF consolidado (varios meses) ───────────────────────────────────────────

export function PerimetralConsolidadoPDF({
  paginas,
  ranchoNombre,
  desde,
  hasta,
}: PerimetralConsolidadoPDFProps) {
  return (
    <Document
      title={`Monitoreo Perimetral Consolidado — ${ranchoNombre} ${desde}–${hasta}`}
    >
      {paginas.map((p, i) => (
        <PerimetralPagina key={i} {...p} />
      ))}
    </Document>
  )
}
