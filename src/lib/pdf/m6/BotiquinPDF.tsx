// PATRÓN INOCUIDAD — PDF M6
// M7-M12 crean su componente PDF en src/lib/pdf/m<N>/<Modulo>PDF.tsx
// Cada componente recibe props tipadas con los datos del registro y retorna
// un <Document> de @react-pdf/renderer en formato A4 portrait.

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

export interface BotiquinPDFProps {
  folio: string
  rancho: string
  ranchoCodigo: string
  fechaVerificacion: string
  parches_curitas: boolean
  guantes_curacion: boolean
  vendas_tijeras: boolean
  gasas_cinta: boolean
  desinfectante: boolean
  responsableNombre: string
}

const PRIMARY = '#2B7AB5'
const DARK = '#1A1A1A'
const BORDER = '#CCCCCC'
const WHITE = '#FFFFFF'
const MUTED = '#555555'
const ROW_ALT = '#F5F9FE'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    paddingTop: 50,
    paddingBottom: 50,
    paddingLeft: 50,
    paddingRight: 50,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
    borderBottomStyle: 'solid',
    paddingBottom: 8,
  },
  headerLogo: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  headerLogoSub: { fontSize: 7, color: MUTED, marginTop: 2 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  headerTitleSub: { textAlign: 'center', fontSize: 7, color: MUTED, marginTop: 2 },
  headerMeta: { width: 80, fontSize: 7, textAlign: 'right', color: MUTED },

  // ── Section title bar ──────────────────────────────────────────────────
  sectionTitle: {
    backgroundColor: PRIMARY,
    color: WHITE,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    marginTop: 12,
  },

  // ── Info table ─────────────────────────────────────────────────────────
  infoTable: {
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
    borderLeftStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
    marginBottom: 4,
  },
  infoRow: { flexDirection: 'row' },
  infoCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    borderRightStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 8,
    paddingRight: 8,
  },
  infoCellLabel: {
    fontSize: 6,
    color: MUTED,
    marginBottom: 2,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  infoCellValue: { fontSize: 9, color: DARK },

  // ── Materiales table ───────────────────────────────────────────────────
  artTable: {
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
    borderLeftStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
    marginBottom: 4,
  },
  artHeaderRow: { flexDirection: 'row', backgroundColor: PRIMARY },
  artRow: { flexDirection: 'row' },
  artRowAlt: { flexDirection: 'row', backgroundColor: ROW_ALT },
  artHeaderCell: {
    color: WHITE,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 8,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#5599CC',
    borderRightStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: '#5599CC',
    borderBottomStyle: 'solid',
  },
  artCell: {
    fontSize: 9,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    borderRightStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
  },
  artCellEstado: {
    fontSize: 9,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: BORDER,
    borderRightStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
    fontFamily: 'Helvetica-Bold',
  },
  estadoSi: { color: '#0D5A8F', backgroundColor: '#E3F2FD' },
  estadoNo: { color: '#993C1D', backgroundColor: '#FAECE7' },

  // ── Firmas ─────────────────────────────────────────────────────────────
  firmasSection: { marginTop: 36 },
  firmasRow: { flexDirection: 'row', gap: 32 },
  firmaBox: { flex: 1 },
  firmaLinea: {
    borderTopWidth: 1,
    borderTopColor: DARK,
    borderTopStyle: 'solid',
    paddingTop: 4,
    marginTop: 32,
  },
  firmaLabel: { fontSize: 7, color: MUTED },
  firmaNombre: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 2 },

  // ── Footer ─────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
    paddingTop: 4,
  },
  footerText: { fontSize: 6, color: '#888888' },
})

const ARTICULOS: { key: keyof Pick<BotiquinPDFProps, 'parches_curitas' | 'guantes_curacion' | 'vendas_tijeras' | 'gasas_cinta' | 'desinfectante'>; label: string }[] = [
  { key: 'parches_curitas', label: 'Parches / Curitas' },
  { key: 'guantes_curacion', label: 'Guantes de curación' },
  { key: 'vendas_tijeras', label: 'Vendas y tijeras' },
  { key: 'gasas_cinta', label: 'Gasas / Cintas' },
  { key: 'desinfectante', label: 'Desinfectante' },
]

export function BotiquinPDF({
  folio,
  rancho,
  ranchoCodigo,
  fechaVerificacion,
  parches_curitas,
  guantes_curacion,
  vendas_tijeras,
  gasas_cinta,
  desinfectante,
  responsableNombre,
}: BotiquinPDFProps) {
  const emision = new Date().toLocaleDateString('es-MX')
  const valores = { parches_curitas, guantes_curacion, vendas_tijeras, gasas_cinta, desinfectante }
  const presentes = Object.values(valores).filter(Boolean).length

  const fechaFormateada = (() => {
    try {
      return new Date(fechaVerificacion + 'T12:00:00').toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return fechaVerificacion
    }
  })()

  return (
    <Document
      title={`Botiquín ${folio}`}
      author="AgroCampo — DuoMind Solutions"
      subject="Revisión de Materiales de Botiquín de Primeros Auxilios"
    >
      <Page size="A4" style={s.page}>

        {/* Footer fijo en todas las páginas */}
        <View fixed style={s.footer}>
          <Text style={s.footerText}>
            AgroCampo — DuoMind Solutions &amp; Hima Inocuidad Alimentaria
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 2 }}>
            <Text style={s.headerLogo}>AgroCampo</Text>
            <Text style={s.headerLogoSub}>Hima Inocuidad Alimentaria</Text>
          </View>
          <View style={{ flex: 6 }}>
            <Text style={s.headerTitle}>
              REVISIÓN DE MATERIALES DE BOTIQUÍN DE PRIMEROS AUXILIOS
            </Text>
            <Text style={s.headerTitleSub}>
              Clave: MXA-F-SC-SIG · FORMATOS MANUAL DEL SAIA Y BPA's
            </Text>
          </View>
          <View style={{ flex: 2, alignItems: 'flex-end' }}>
            <Text style={s.headerMeta}>Folio: {folio}</Text>
            <Text style={s.headerMeta}>Emisión: {emision}</Text>
          </View>
        </View>

        {/* Sección 1 — Datos del rancho */}
        <Text style={s.sectionTitle}>1. DATOS DEL RANCHO Y VERIFICACIÓN</Text>
        <View style={s.infoTable}>
          <View style={s.infoRow}>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>RANCHO / HUERTO</Text>
              <Text style={s.infoCellValue}>{rancho}</Text>
            </View>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>CÓDIGO</Text>
              <Text style={s.infoCellValue}>{ranchoCodigo}</Text>
            </View>
          </View>
          <View style={s.infoRow}>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>FECHA DE VERIFICACIÓN</Text>
              <Text style={s.infoCellValue}>{fechaFormateada}</Text>
            </View>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>ARTÍCULOS PRESENTES</Text>
              <Text style={s.infoCellValue}>{presentes} / {ARTICULOS.length}</Text>
            </View>
          </View>
        </View>

        {/* Sección 2 — Materiales */}
        <Text style={s.sectionTitle}>2. REVISIÓN DE MATERIALES</Text>
        <View style={s.artTable}>
          <View style={s.artHeaderRow}>
            <Text style={[s.artHeaderCell, { flex: 4 }]}>Artículo</Text>
            <Text style={[s.artHeaderCell, { flex: 1, textAlign: 'center' }]}>Estado</Text>
          </View>
          {ARTICULOS.map((art, i) => {
            const tiene = valores[art.key]
            return (
              <View key={art.key} style={i % 2 === 0 ? s.artRow : s.artRowAlt}>
                <Text style={[s.artCell, { flex: 4 }]}>{art.label}</Text>
                <Text style={[s.artCellEstado, { flex: 1 }, tiene ? s.estadoSi : s.estadoNo]}>
                  {tiene ? 'Sí' : 'No'}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Sección 3 — Firmas */}
        <Text style={[s.sectionTitle, { marginTop: 20 }]}>3. FIRMAS Y RESPONSABLES</Text>
        <View style={s.firmasSection}>
          <View style={s.firmasRow}>
            {/* Firma del responsable que verificó */}
            <View style={s.firmaBox}>
              <Text style={s.firmaLabel}>Responsable que realizó la verificación</Text>
              <Text style={s.firmaNombre}>{responsableNombre}</Text>
              <View style={s.firmaLinea}>
                <Text style={s.firmaLabel}>Firma del responsable</Text>
              </View>
            </View>

            {/* Firma del Responsable de Inocuidad — espacio separado */}
            <View style={s.firmaBox}>
              <Text style={s.firmaLabel}>&nbsp;</Text>
              <Text style={s.firmaNombre}>&nbsp;</Text>
              <View style={s.firmaLinea}>
                <Text style={s.firmaLabel}>Responsable de Inocuidad — Firma</Text>
              </View>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  )
}
