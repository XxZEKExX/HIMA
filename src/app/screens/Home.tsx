import { Link } from 'react-router'
import {
  Plus, CheckCircle, Clock, Shield, ClipboardCheck, ClipboardList, Droplets,
  Sprout, Eye, Package, FileCheck, Loader2, TriangleAlert, Clock3,
  Users, AlertTriangle, ChevronRight,
} from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'
import { useHomeDashboard } from '@/hooks/useHomeDashboard'
import { useCorreccionesPendientes } from '@/hooks/useCorreccionesPendientes'
import { MadyLogo } from '@/app/components/MadyLogo'

// ── Módulos de inocuidad — navegación estática ────────────────────────────────
// lastEntry y status se calcularán cuando M8-M12 estén integrados a BD.

const INOCUIDAD_MODULES = [
  { id: 'botiquin',      title: 'Botiquín de Primeros Auxilios', icon: Shield,        frequency: 'Semanal',    path: '/inocuidad/botiquin' },
  { id: 'vidrio',        title: 'Inspección de Vidrio y Plástico', icon: Eye,         frequency: 'Quincenal',  path: '/inocuidad/vidrio-plastico' },
  { id: 'fertilizacion', title: 'Registro de Fertilización',      icon: Sprout,       frequency: 'Por evento', path: '/inocuidad/fertilizacion' },
  { id: 'perimetral',    title: 'Inspección Perimetral',          icon: ClipboardCheck, frequency: 'Semanal',  path: '/inocuidad/perimetral' },
  { id: 'cosecha',       title: 'Cosecha y Liberación',           icon: Package,      frequency: 'Por evento', path: '/inocuidad/cosecha' },
  { id: 'preoperacional',title: 'Inspección Pre-operacional',     icon: FileCheck,    frequency: 'Diario',     path: '/inocuidad/preoperacional' },
  { id: 'limpieza-banos',title: 'Limpieza de Baños',             icon: Droplets,     frequency: 'Diario',     path: '/inocuidad/limpieza-banos' },
  { id: 'incidencias',   title: 'Reporte de Incidencias',        icon: ClipboardList, frequency: 'Por evento', path: '/inocuidad/incidencias' },
  { id: 'auditoria-saia',   title: 'Auditoría SAIA (M1)',           icon: ClipboardCheck, frequency: 'Por evento', path: '/inocuidad/auditoria-saia' },
  { id: 'auditoria-granja', title: 'Auditoría Granja (M2 BPA)',     icon: Sprout,         frequency: 'Por evento', path: '/inocuidad/auditoria-granja' },
  { id: 'auditoria-cosecha',title: 'Auditoría Cuadrilla (M4 BPA)', icon: Users,          frequency: 'Por evento', path: '/inocuidad/auditoria-cosecha' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFechaCorta(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short',
    })
  } catch {
    return iso
  }
}

function formatHa(ha: number): string {
  if (ha === 0) return '0'
  return ha % 1 === 0 ? String(ha) : ha.toFixed(1)
}

function formatDias(dias: number | null): string {
  if (dias === null) return '—'
  if (dias === 0) return 'Hoy'
  if (dias === 1) return '1 día'
  return `${dias} días`
}

// ── Pantalla ──────────────────────────────────────────────────────────────────

export function Home() {
  const { profile } = useAuthContext()
  const { orgNombre, orgPlan, metricas, recientes, loading, error } = useHomeDashboard()
  const { items: correcciones, count: countCorrecciones } = useCorreccionesPendientes()

  const esAdmin = profile?.rol === 'admin_org'
  const nombreUsuario = profile?.nombre_completo ?? '—'
  const nombreOrg = orgNombre ?? '—'

  const hayActividad = recientes.length > 0

  return (
    <div className="min-h-full pb-[calc(72px+34px)]">

      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs" style={{ fontWeight: 600 }}>AC</span>
            </div>
            <MadyLogo theme="light" className="text-sm" style={{ fontWeight: 600 }} />
          </div>
          <div className="text-right min-w-0 flex-1 ml-3">
            <div className="text-sm text-foreground truncate" style={{ fontWeight: 600 }}>
              {loading ? '...' : nombreUsuario}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {loading ? '...' : nombreOrg}
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">

        {/* Banner de cuenta pendiente de activación */}
        {!loading && orgPlan === 'pendiente' && (
          <div
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ backgroundColor: 'var(--agro-warning-fill)', border: '1px solid var(--agro-amber)' }}
          >
            <Clock3 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--agro-warning-text)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--agro-warning-text)', fontWeight: 600 }}>
                Tu cuenta está pendiente de activación
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--agro-warning-text)' }}>
                Si ya realizaste tu pago, en breve activaremos tu plan. ¿Dudas?{' '}
                <a
                  href="mailto:contacto@duomindsolutions.com"
                  className="underline"
                  style={{ color: 'var(--agro-warning-text)' }}
                >
                  Contáctanos
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {/* Error de carga */}
        {error && !loading && (
          <div
            className="flex items-start gap-2 rounded-xl p-3"
            style={{ backgroundColor: 'var(--agro-danger-fill)', border: '1px solid var(--agro-red)' }}
          >
            <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--agro-danger-text)' }} />
            <p className="text-xs" style={{ color: 'var(--agro-danger-text)' }}>
              Error al cargar el dashboard. Verifica tu conexión.
            </p>
          </div>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3">

          {/* Aplicaciones este mes */}
          <div className="bg-card rounded-xl p-4 border border-border">
            {loading ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mb-1" />
            ) : (
              <div className="text-2xl mb-1" style={{ fontWeight: 600 }}>
                {metricas.appsMes}
              </div>
            )}
            <div className="text-xs text-muted-foreground">Aplicaciones este mes</div>
          </div>

          {/* Productos distintos usados */}
          <div className="bg-card rounded-xl p-4 border border-border">
            {loading ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mb-1" />
            ) : (
              <div className="text-2xl mb-1" style={{ fontWeight: 600 }}>
                {metricas.productosDistintos}
              </div>
            )}
            <div className="text-xs text-muted-foreground">Productos distintos usados</div>
          </div>

          {/* Días desde última aplicación */}
          <div className="bg-card rounded-xl p-4 border border-border">
            {loading ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mb-1" />
            ) : (
              <div className="text-2xl mb-1" style={{ fontWeight: 600 }}>
                {formatDias(metricas.diasDesdeUltimaApp)}
              </div>
            )}
            <div className="text-xs text-muted-foreground">Desde última aplicación</div>
          </div>

          {/* Superficie activa */}
          <div className="bg-card rounded-xl p-4 border border-border">
            {loading ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mb-1" />
            ) : (
              <div className="text-2xl mb-1" style={{ fontWeight: 600 }}>
                {formatHa(metricas.superficieHa)} ha
              </div>
            )}
            <div className="text-xs text-muted-foreground">Superficie activa</div>
          </div>

        </div>

        {/* Correcciones pendientes — visible para todos si tienen correcciones */}
        {!loading && countCorrecciones > 0 && (
          <div
            className="rounded-xl overflow-hidden border"
            style={{ borderColor: 'var(--agro-amber)' }}
          >
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{ backgroundColor: 'var(--agro-warning-fill)' }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--agro-warning-text)' }} />
              <span className="text-sm flex-1" style={{ color: 'var(--agro-warning-text)', fontWeight: 600 }}>
                {countCorrecciones} {countCorrecciones === 1 ? 'registro requiere' : 'registros requieren'} tu corrección
              </span>
            </div>
            <div className="bg-card divide-y divide-border">
              {correcciones.slice(0, 3).map((item) => (
                <div key={`${item.tabla}-${item.id}`} className="px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">{item.moduloLabel} · {item.rancho_nombre}</p>
                  <p className="text-xs" style={{ color: 'var(--agro-warning-text)' }}>
                    {item.comentario_correccion ?? 'Revisa este registro'}
                  </p>
                </div>
              ))}
              {countCorrecciones > 3 && (
                <div className="px-4 py-2">
                  <p className="text-xs text-muted-foreground">+{countCorrecciones - 3} más</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Acceso rápido al equipo — solo admin_org */}
        {esAdmin && !loading && (
          <Link
            to="/equipo/actividad"
            className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary transition-colors"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground" style={{ fontWeight: 600 }}>Actividad del equipo</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ver registros de todos los empleados
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </Link>
        )}

        {/* Actividad reciente */}
        <div>
          <h2 className="mb-3 text-foreground" style={{ fontWeight: 600 }}>Actividad reciente</h2>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : !hayActividad ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                Sin actividad aún
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Registra tu primer rancho y crea una aplicación para ver el historial aquí.
              </p>
              <Link
                to="/nueva-aplicacion"
                className="inline-block mt-3 h-9 px-4 rounded-xl text-sm text-white bg-primary hover:bg-agro-blue transition-colors"
                style={{ lineHeight: '36px', fontWeight: 600 }}
              >
                Nueva aplicación
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recientes.map((app) => {
                const productosTexto = app.productos.length === 0
                  ? 'Sin productos registrados'
                  : app.productos.length === 1
                    ? app.productos[0]
                    : `${app.productos[0]} +${app.productos.length - 1}`

                return (
                  <Link
                    key={app.id}
                    to={`/historial/${app.id}`}
                    className="block bg-card rounded-xl p-4 border border-border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {formatFechaCorta(app.fecha)}
                          </span>
                          {app.status === 'completado' ? (
                            <span
                              className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                              style={{
                                backgroundColor: 'var(--agro-success-fill)',
                                color: 'var(--agro-success-text)',
                                fontWeight: 600,
                              }}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Completado
                            </span>
                          ) : (
                            <span
                              className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                              style={{
                                backgroundColor: 'var(--agro-warning-fill)',
                                color: 'var(--agro-warning-text)',
                                fontWeight: 600,
                              }}
                            >
                              <Clock className="w-3 h-3" />
                              Borrador
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-foreground truncate" style={{ fontWeight: 600 }}>
                          {productosTexto}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Inocuidad y BPAs */}
        <div>
          <h2 className="mb-3 text-foreground" style={{ fontWeight: 600 }}>Inocuidad y BPAs</h2>
          <div className="space-y-3">
            {INOCUIDAD_MODULES.map((module) => {
              const Icon = module.icon
              return (
                <Link
                  key={module.id}
                  to={module.path}
                  className="block bg-card rounded-xl p-4 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate" style={{ fontWeight: 600 }}>
                        {module.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {module.frequency}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

      </div>

      {/* FAB */}
      <Link
        to="/nueva-aplicacion"
        className="fixed bottom-[calc(72px+34px+16px)] right-4 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-agro-blue transition-colors"
        style={{ maxWidth: 'calc(390px - 32px - 56px + 56px)' }}
        aria-label="Nueva aplicación"
      >
        <Plus className="w-6 h-6 text-white" />
      </Link>
    </div>
  )
}
