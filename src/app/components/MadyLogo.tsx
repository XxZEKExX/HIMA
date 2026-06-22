type LogoTheme = 'light' | 'dark'

/**
 * Logo M.A.D.Y con colores por letra.
 * light (fondo claro): M·A #2B7AB5, D·Y #0D5A8F, puntos gris tenue.
 * dark  (fondo oscuro): M·A #5BADD9, D·Y #FFFFFF,  puntos blanco tenue.
 *
 * fontWeight y fontSize se heredan del elemento contenedor.
 */
export function MadyLogo({
  theme = 'light',
  className,
  style,
}: {
  theme?: LogoTheme
  className?: string
  style?: React.CSSProperties
}) {
  const ma  = theme === 'dark' ? '#5BADD9' : '#2B7AB5'
  const dy  = theme === 'dark' ? '#FFFFFF'  : '#0D5A8F'
  const dot = theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.22)'

  return (
    <span className={className} style={{ letterSpacing: '0.01em', ...style }}>
      <span style={{ color: ma }}>M</span>
      <span style={{ color: dot }}>.</span>
      <span style={{ color: ma }}>A</span>
      <span style={{ color: dot }}>.</span>
      <span style={{ color: dy }}>D</span>
      <span style={{ color: dot }}>.</span>
      <span style={{ color: dy }}>Y</span>
    </span>
  )
}
