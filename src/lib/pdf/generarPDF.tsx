import { pdf } from '@react-pdf/renderer'
import { AplicacionPDF } from './AplicacionPDF'
import type { AplicacionPDFProps } from './AplicacionPDF'

export async function generarAplicacionPDF(props: AplicacionPDFProps): Promise<void> {
  const { aplicacion, rancho } = props

  const fecha = aplicacion.fecha_aplicacion.replaceAll('-', '')
  const ranchoSlug = rancho.nombre
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  const filename = `aplicacion-${fecha}-${ranchoSlug}.pdf`

  const blob = await pdf(<AplicacionPDF {...props} />).toBlob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
