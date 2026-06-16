// PATRÓN INOCUIDAD — PDF M11
// PreoperacionalPagina: una página A4 portrait por inspección (reutilizable).
// PreoperacionalPDF:    documento individual.
// PreoperacionalConsolidadoPDF: multi-página, uno por inspección.

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ValorPreoperacional = 'SI' | 'NO' | 'NA'

export interface M11ItemPDF {
  id: string
  seccion_label: string
  item: string
  valor: ValorPreoperacional
  codigo_correctivo: string | null
}

export interface PreoperacionalPaginaProps {
  rancho: string
  ranchoCodigo: string
  fecha: string           // "2026-06-15" ISO
  realizadoPor: string | null
  items: M11ItemPDF[]     // 48 ítems ordenados por seccion/orden
  observaciones: string | null
}

export interface PreoperacionalConsolidadoPDFProps {
  paginas: PreoperacionalPaginaProps[]
  ranchoNombre: string
  desde: string
  hasta: string
}

// ── Paleta ────────────────────────────────────────────────────────────────────

const PRIMARY   = '#2B7AB5'
const DARK      = '#1A1A1A'
const BORDER    = '#CCCCCC'
const WHITE     = '#FFFFFF'
const MUTED     = '#555555'
const ROW_ALT   = '#F5F9FE'
const SI_BG     = '#E3F2FD'
const SI_TEXT   = '#0D5A8F'
const NO_BG     = '#FAECE7'
const NO_TEXT   = '#993C1D'
const NA_BG     = '#F0F0F4'
const NA_TEXT   = '#717182'

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: DARK,
    paddingTop: 45,
    paddingBottom: 45,
    paddingLeft: 36,
    paddingRight: 36,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
    paddingBottom: 6,
  },
  headerLogo:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  headerLogoSub: { fontSize: 6, color: MUTED, marginTop: 2 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  headerTitleSub: { textAlign: 'center', fontSize: 6, color: MUTED, marginTop: 2 },
  headerMeta: { fontSize: 6, textAlign: 'right', color: MUTED },

  // Info chips
  infoTable: {
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginBottom: 6,
  },
  infoRow: { flexDirection: 'row' },
  infoCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 6,
    paddingRight: 6,
  },
  infoCellLabel: { fontSize: 5.5, color: MUTED, marginBottom: 1.5, fontFamily: 'Helvetica-Bold' },
  infoCellValue: { fontSize: 8, color: DARK },

  // Sección header
  seccionBand: {
    backgroundColor: PRIMARY,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 6,
    marginTop: 4,
  },
  seccionText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: WHITE },

  // Item rows
  itemRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 14,
  },
  itemText: {
    flex: 1,
    fontSize: 7,
    paddingTop: 3,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 4,
    color: DARK,
    alignSelf: 'center',
  },
  valorChip: {
    width: 28,
    textAlign: 'center',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    paddingTop: 3,
    paddingBottom: 2,
    alignSelf: 'center',
  },
  codigoCell: {
    width: 70,
    fontSize: 6,
    paddingTop: 3,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    color: NO_TEXT,
    alignSelf: 'center',
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
  },

  // Observaciones
  obsSection: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 6,
    paddingRight: 6,
  },
  obsLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: MUTED, marginBottom: 2 },
  obsText:  { fontSize: 7, color: DARK },

  // Firma
  firmaSection: { marginTop: 20, flexDirection: 'row', gap: 24 },
  firmaBox:     { flex: 1 },
  firmaLinea: {
    borderTopWidth: 1,
    borderTopColor: DARK,
    paddingTop: 4,
    marginTop: 28,
  },
  firmaLabel: { fontSize: 7, color: MUTED },

  // Footer fijo
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 3,
  },
  footerText: { fontSize: 5.5, color: '#888888' },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFechaPDF(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return iso }
}

function agruparItemsPorSeccion(items: M11ItemPDF[]) {
  const grupos: { label: string; items: M11ItemPDF[] }[] = []
  let actual: { label: string; items: M11ItemPDF[] } | null = null
  for (const item of items) {
    if (!actual || actual.label !== item.seccion_label) {
      actual = { label: item.seccion_label, items: [] }
      grupos.push(actual)
    }
    actual.items.push(item)
  }
  return grupos
}

function valorStyle(v: ValorPreoperacional) {
  if (v === 'SI') return { color: SI_TEXT, backgroundColor: SI_BG }
  if (v === 'NO') return { color: NO_TEXT, backgroundColor: NO_BG }
  return { color: NA_TEXT, backgroundColor: NA_BG }
}

// ── Componente de página ──────────────────────────────────────────────────────

export function PreoperacionalPagina({
  rancho, ranchoCodigo, fecha, realizadoPor, items, observaciones,
}: PreoperacionalPaginaProps) {
  const secciones = agruparItemsPorSeccion(items)
  const emision = new Date().toLocaleDateString('es-MX')
  const totalNO = items.filter((i) => i.valor === 'NO').length

  return (
    <Page size="A4" style={s.page}>

      {/* Footer fijo */}
      <View fixed style={s.footer}>
        <Text style={s.footerText}>AgroCampo — DuoMind Solutions &amp; Hima Inocuidad Alimentaria</Text>
        <Text
          style={s.footerText}
          render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`}
        />
      </View>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 2 }}>
          <Text style={s.headerLogo}>AgroCampo</Text>
          <Text style={s.headerLogoSub}>Hima Inocuidad Alimentaria</Text>
        </View>
        <View style={{ flex: 6 }}>
          <Text style={s.headerTitle}>INSPECCION PREOPERACIONAL</Text>
          <Text style={s.headerTitleSub}>
            Clave: MXA-F-SC-SIG · FORMATOS MANUAL DEL SAIA Y BPA's
          </Text>
        </View>
        <View style={{ flex: 2, alignItems: 'flex-end' }}>
          <Text style={s.headerMeta}>Emision: {emision}</Text>
          {totalNO > 0 && (
            <Text style={[s.headerMeta, { color: NO_TEXT, fontFamily: 'Helvetica-Bold' }]}>
              {totalNO} observacion(es)
            </Text>
          )}
        </View>
      </View>

      {/* Info chips */}
      <View style={s.infoTable}>
        <View style={s.infoRow}>
          <View style={[s.infoCell, { flex: 3 }]}>
            <Text style={s.infoCellLabel}>RANCHO / HUERTO</Text>
            <Text style={s.infoCellValue}>{rancho}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoCellLabel}>CODIGO</Text>
            <Text style={s.infoCellValue}>{ranchoCodigo}</Text>
          </View>
          <View style={[s.infoCell, { flex: 3 }]}>
            <Text style={s.infoCellLabel}>FECHA DE INSPECCION</Text>
            <Text style={s.infoCellValue}>{formatFechaPDF(fecha)}</Text>
          </View>
          <View style={[s.infoCell, { flex: 2 }]}>
            <Text style={s.infoCellLabel}>REALIZO</Text>
            <Text style={s.infoCellValue}>{realizadoPor ?? '—'}</Text>
          </View>
        </View>
      </View>

      {/* Tabla de ítems por sección */}
      {secciones.map((sec) => (
        <View key={sec.label}>
          <View style={s.seccionBand}>
            <Text style={s.seccionText}>{sec.label}</Text>
          </View>
          {sec.items.map((item, idx) => {
            const rowBg = idx % 2 === 0 ? WHITE : ROW_ALT
            const vStyle = valorStyle(item.valor)
            return (
              <View key={item.id} style={[s.itemRow, { backgroundColor: rowBg }]}>
                <Text style={s.itemText}>{item.item}</Text>
                <Text style={[s.valorChip, vStyle]}>{item.valor}</Text>
                <Text style={s.codigoCell}>
                  {item.codigo_correctivo ? `Cód: ${item.codigo_correctivo}` : ''}
                </Text>
              </View>
            )
          })}
        </View>
      ))}

      {/* Observaciones */}
      {observaciones ? (
        <View style={s.obsSection}>
          <Text style={s.obsLabel}>OBSERVACIONES GENERALES</Text>
          <Text style={s.obsText}>{observaciones}</Text>
        </View>
      ) : null}

      {/* Firma */}
      <View style={s.firmaSection}>
        <View style={s.firmaBox}>
          <Text style={s.firmaLabel}>Realizo la inspeccion: {realizadoPor ?? '—'}</Text>
          <View style={s.firmaLinea}>
            <Text style={s.firmaLabel}>Firma</Text>
          </View>
        </View>
        <View style={s.firmaBox}>
          <Text style={s.firmaLabel}>&nbsp;</Text>
          <View style={s.firmaLinea}>
            <Text style={s.firmaLabel}>Responsable de Inocuidad — Firma</Text>
          </View>
        </View>
      </View>

    </Page>
  )
}

// ── PDF individual ─────────────────────────────────────────────────────────────

export function PreoperacionalPDF(props: PreoperacionalPaginaProps) {
  return (
    <Document
      title={`Inspeccion Preoperacional ${props.rancho} ${props.fecha}`}
      author="AgroCampo — DuoMind Solutions"
      subject="Inspeccion Preoperacional de Cosecha"
    >
      <PreoperacionalPagina {...props} />
    </Document>
  )
}

// ── PDF consolidado ────────────────────────────────────────────────────────────

export function PreoperacionalConsolidadoPDF({
  paginas, ranchoNombre, desde, hasta,
}: PreoperacionalConsolidadoPDFProps) {
  return (
    <Document
      title={`Inspeccion Preoperacional Consolidado ${ranchoNombre} ${desde} ${hasta}`}
      author="AgroCampo — DuoMind Solutions"
      subject="Inspeccion Preoperacional Consolidado"
    >
      {paginas.map((p, i) => (
        <PreoperacionalPagina key={i} {...p} />
      ))}
    </Document>
  )
}
