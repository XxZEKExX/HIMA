# CLAUDE.md — AgroCampo

Contexto completo para Claude Code. Léelo antes de tocar cualquier archivo.

---

## 0. Modelo de negocio

**AgroCampo es un SaaS multi-tenant** de trazabilidad agrícola e inocuidad alimentaria para el sector berry (GlobalGAP, USDA, SENASICA). El modelo anterior (app para un cliente único) cambió.

**Tenants ("organizaciones"):** Pueden ser empresas (tipo ANEBERRIES o similar) o asesores de inocuidad individuales. Cada tenant tiene aislamiento total de datos — un tenant nunca ve los datos de otro.

**Hima Inocuidad Alimentaria** ya NO es el cliente. Es socio/distribuidor/inversor. Tiene un convenio de asociación en participación con DuoMind Solutions (Arts. 252–259 del Código de Comercio MX). Fase 1: 60% Hima / 40% DuoMind. Post-recuperación de inversión: 50/50.

**Catálogo de productos (ANEBERRIES):** Global y compartido entre todos los tenants. 723 productos, 936 autorizaciones, 4 cultivos (Zarzamora, Frambuesa, Fresa, Mora azul). No lleva `org_id`.

**Planes (ya en el esquema, sin implementar cobro):** `free | basico | pro | enterprise`.

**Desarrolladores:**
- Luviano Sánchez Saúl — DuoMind Solutions
- Medina Moreno Moisés — DuoMind Solutions

---

## 1. Stack técnico

```
Frontend:       React 18.3.1 + TypeScript + Vite 6.3.5
Estilos:        Tailwind CSS v4 (@tailwindcss/vite 4.1.12) + shadcn/ui (40+ componentes)
Routing:        React Router 7.13.0 (importar de 'react-router', NO de 'react-router-dom')
Base de datos:  Supabase (PostgreSQL + Auth + RLS) — proyecto: glrjesvtsspilkacooln
PDF:            @react-pdf/renderer 4.5.1 (client-side, descarga directa)
Excel:          exceljs 4.4.0 (client-side, con polyfill buffer)
UI extra:       lucide-react 0.487.0, sonner 2.0.3, cmdk 1.1.1, motion 12.23.24
Gestor paquetes: pnpm EXCLUSIVAMENTE (nunca npm ni yarn)
```

**Variables de entorno:**
```
VITE_SUPABASE_URL=https://glrjesvtsspilkacooln.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   ← solo para seeds locales, NUNCA al frontend ni a git
```

**Comandos:**
```bash
pnpm install
pnpm run dev         # localhost:5173
pnpm run build       # dist/
pnpm run seed:aneberries          # seed zarzamora
pnpm run seed:aneberries:todos    # seed todos los cultivos
```

**Proyecto Supabase activo:** `glrjesvtsspilkacooln` (el anterior `yntpbchpjjydswooyast` está pausado/obsoleto).

---

## 2. Diseño y design system

**Mobile-first** (390×844px base), minimalista, sin sombras ni gradientes. Navegación: barra inferior 5 tabs.

### Tokens CSS — única fuente de verdad (src/styles/theme.css, bloque `@theme inline`)

```css
--primary:              #2B7AB5   /* Azul — botones, toggles activos, FAB */
--agro-blue:            #1E88C7   /* Azul secundario (hover) */
--agro-red:             #C02A2A   /* Destructivo / alertas críticas */
--agro-amber:           #F5A623   /* Advertencias */
--background:           #F8F9FA
--card:                 #FFFFFF
--muted:                #ececf0   /* Fondos de sección header */
--muted-foreground:     #717182   /* Texto secundario / disabled */
--input-background:     #f3f3f5
--switch-background:    #cbced4   /* Toggle inactivo */
--border:               rgba(0,0,0,0.1)
--radius:               0.625rem

/* Semánticos */
--agro-success-fill:    #E3F2FD   /* Fondo success/info */
--agro-success-text:    #0D5A8F
--agro-warning-fill:    #FAEEDA
--agro-warning-text:    #854F0B
--agro-danger-fill:     #FAECE7
--agro-danger-text:     #993C1D
```

**Reglas:** Inter / Nunito Sans, weight 400/600. NO verde como primario. NO hardcodear hex — usar siempre las variables CSS. FAB: 56px círculo, `bg-primary`, ícono blanco "+". Bottom sheet: 85% altura, handle bar, border-radius top 0.625rem.

---

## 3. Arquitectura multi-tenant

### Tabla organizaciones
```
id, nombre, tipo ('empresa'|'individuo'), plan ('free'|'basico'|'pro'|'enterprise'),
estado ('activa'|'suspendida'|'cancelada'), created_at
```

### org_id en tablas
- **Llevan `org_id NOT NULL`:** profiles (nullable), productores, ranchos, aplicaciones, aplicacion_productos, inventario_movimientos, m6_botiquin, m7_vidrio_plastico, m8_fertilizacion, m9_perimetral_*, m10_cosecha_liberacion, m11_preoperacional_registros, m12_limpieza_banos.
- **NO llevan `org_id` (globales):** catalogo_productos, producto_autorizaciones, organizaciones.

### Roles
```
super_admin     → DuoMind Solutions (acceso total, cross-tenant)
admin_org       → Admin de su organización (antes llamado admin_hima)
asesor_tecnico  → Supervisión, recomendaciones
operario        → Productor de campo (solo ve sus propios registros)
```

### Flujo de registro
1. Usuario se registra con email/password → Supabase crea `auth.user`
2. El trigger `on_auth_user_created` crea un `profile` con `org_id = null`
3. App detecta `profile.org_id IS NULL` → `RequireOrg` redirige a `/completar-organizacion`
4. RPC `completar_registro_organizacion(p_nombre_org)` crea la organización, asigna el perfil como `admin_org` y crea el registro en `productores` — todo atómico
5. App navega a `/`

### RLS
- Función `get_my_org_id()` devuelve el `org_id` del usuario autenticado
- Políticas RLS aíslan por organización en todas las tablas con `org_id`
- `super_admin` tiene acceso cross-tenant

### REGLA CRÍTICA — org_id
**El `org_id` NUNCA se pide al usuario ni viene del frontend.** Siempre del contexto de auth:
```typescript
const { profile } = useAuthContext()
// profile.org_id  ← usar esto siempre
```

---

## 4. Estructura del código

```
src/
├── main.tsx
├── app/
│   ├── App.tsx                       # RouterProvider
│   ├── routes.tsx                    # createBrowserRouter — 14 rutas
│   ├── screens/                      # 18 pantallas page-level
│   │   ├── Home.tsx                  # Dashboard (datos mock — pendiente)
│   │   ├── Login.tsx / Registro.tsx / CompletarOrganizacion.tsx
│   │   ├── NuevaAplicacion.tsx       # M1 ✅ COMPLETO
│   │   ├── Inventario.tsx            # M2 ✅ COMPLETO
│   │   ├── Historial.tsx / DetalleAplicacion.tsx   # M3 ✅
│   │   ├── Perfil.tsx / MiOrganizacion.tsx         # M5
│   │   ├── BotiquinPrimerosAuxilios.tsx            # M6 ✅ COMPLETO
│   │   ├── InspeccionVidrioPlastico.tsx            # M7 ✅ COMPLETO
│   │   ├── RegistroFertilizacion.tsx               # M8 ⏳ mock
│   │   ├── InspeccionPerimetral.tsx                # M9 ⏳ mock
│   │   ├── RegistroCosechaLiberacion.tsx           # M10 ⏳ mock
│   │   ├── InspeccionPreoperacionalCosecha.tsx     # M11 ⏳ mock
│   │   └── RegistroLimpiezaBanos.tsx               # M12 ⏳ mock
│   └── components/
│       ├── Layout.tsx                # Bottom nav 5 tabs, max-width 390px
│       ├── RequireAuth.tsx / RequireOrg.tsx
│       ├── FormField.tsx / FormSelect.tsx
│       ├── nueva-aplicacion/         # Step1–Step4 + ProductoCombobox
│       └── ui/                       # shadcn/ui (40+ componentes)
├── context/
│   └── AuthContext.tsx               # Provider con signIn, signOut, signUp
├── hooks/
│   ├── useAuth.ts                    # Estado auth + carga de perfil/productor
│   ├── useRanchos.ts                 # Ranchos del productor activo
│   ├── useCatalogoProductos.ts       # Catálogo global activo
│   ├── useInventario.ts              # Saldos por rancho y productor
│   ├── useBotiquin.ts                # M6 — registros de botiquín con join a ranchos
│   └── useVidrioPlastico.ts          # M7 — filas agrupadas en inspecciones
├── lib/
│   ├── supabase.ts                   # createClient con storageKey 'agrocampo-auth'
│   ├── queries.ts                    # 20+ funciones CRUD (ranchos, aplicaciones, inventario)
│   ├── fenologia.ts                  # Labels de etapas fenológicas
│   ├── pdf/
│   │   ├── AplicacionPDF.tsx         # M1 — componente PDF A4 landscape
│   │   ├── generarPDF.tsx            # Genera blob y descarga M1
│   │   ├── m6/                       # BotiquinPDF + generadores individual/consolidado
│   │   └── m7/                       # VidrioPlasticoPDF + generadores individual/consolidado
│   └── excel/
│       └── generarExcelHistorial.ts  # M1 Excel — 2 hojas: Historial + Formato oficial
├── types/
│   └── database.types.ts             # Tipos TypeScript completos (906 líneas) — fuente de verdad
├── data/
│   └── mock.ts                       # Datos mock para Home y pantallas no integradas
└── scripts/
    ├── seed-aneberries-zarzamora.ts
    └── seed-aneberries-todos.ts
```

### Rutas

| Ruta | Pantalla |
|------|----------|
| `/` | Home |
| `/nueva-aplicacion` | M1 — Formulario 4 pasos |
| `/inventario` | M2 |
| `/historial` | M3 listado |
| `/historial/:id` | DetalleAplicacion |
| `/perfil` | M5 |
| `/perfil/mi-organizacion` | MiOrganizacion |
| `/inocuidad/botiquin` | M6 |
| `/inocuidad/vidrio-plastico` | M7 |
| `/inocuidad/fertilizacion` | M8 |
| `/inocuidad/perimetral` | M9 |
| `/inocuidad/cosecha` | M10 |
| `/inocuidad/preoperacional` | M11 |
| `/inocuidad/limpieza-banos` | M12 |

---

## 5. Estado de módulos

### ✅ M1 — Registro de Aplicaciones Foliares/Drench (COMPLETO)
- Formulario 4 pasos: Parcela/cultivo → Productos → Aplicación/agua → Cierre
- `ProductoCombobox`: búsqueda con cmdk, resultados agrupados por categoría (7 categorías)
- Guarda en `aplicaciones` + `aplicacion_productos`
- Descuenta inventario automáticamente al guardar → inserta en `inventario_movimientos` (tipo `salida`)
- Genera PDF automáticamente (A4 landscape, 7 secciones)
- Exportación Excel desde DetalleAplicacion (2 hojas: Historial + Formato oficial SAIA/BPA)

### ✅ M2 — Inventario (COMPLETO)
- Saldos calculados por vistas SQL `v_inventario_saldo_rancho` y `v_inventario_saldo_productor`
- Dos vistas en la pantalla: por rancho / por productor
- Movimientos manuales: entrada, salida, ajuste (con validación de stock)
- Salida automática desde M1 no bloquea (permite saldo negativo)
- Saldo negativo se muestra en rojo en la UI
- Historial inline de movimientos por producto

### ✅ M3 — Historial (COMPLETO)
- Lista de aplicaciones con filtros
- DetalleAplicacion: vista completa con PDF y Excel

### ✅ M6 — Botiquín de Primeros Auxilios (COMPLETO)
- Clave: MXA-F-SC-SIG · Frecuencia: Semanal
- 5 artículos con toggle Sí/No (default: todos Sí): Parches/Curitas, Guantes de curación, Vendas y tijeras, Gasas/Cintas, Desinfectante
- PDF individual + consolidado por rango de fechas (una página por registro)
- **Trigger BD:** `BOTIQUIN_LIMITE_SEMANAL` — bloquea un segundo registro en los 7 días siguientes para el mismo rancho
- Prevención proactiva en UI (banner ámbar + deshabilita guardar) + captura del error del trigger con toast

### ✅ M7 — Inspección de Vidrio y Plástico Duro (COMPLETO)
- Clave: MXA-F-SC-SIG-029.14 · Frecuencia: Quincenal (14 días)
- **Diferencia clave vs M6:** una inspección = VARIAS filas en `m7_vidrio_plastico` (una por material)
  - Hook `useVidrioPlastico` agrupa filas por `rancho_id + fecha` → devuelve `M7Inspeccion[]`
  - Formulario dinámico: add/remove filas de materiales
- Campos por fila: Área (text + sugerencias), Material/Equipo (text + sugerencias), Protegido (toggle, default Sí), Estado (Bueno/Deteriorado/Reemplazo, default Bueno), Observaciones
- PDF individual + consolidado por rango de fechas
- **Trigger BD:** `M7_LIMITE_QUINCENAL` — bloquea nueva inspección si ya hubo una en los 14 días previos (permite múltiples filas con la misma fecha = misma inspección)
- Prevención proactiva + captura de error del trigger

### ⏳ M8-M12 — Módulos SAIA/BPA restantes (UI estática con mock data)
Las tablas están definidas en Supabase y en `database.types.ts`. Las pantallas existen pero usan `useState(mockEntries)` sin conexión a BD. Ninguno tiene hook, generador PDF, ni funciones en `queries.ts`.

| Módulo | Tabla BD | Frecuencia |
|--------|----------|------------|
| M8 Fertilización (`/inocuidad/fertilizacion`) | `m8_fertilizacion` | Por evento |
| M9 Inspección Perimetral (`/inocuidad/perimetral`) | `m9_perimetral_config` + `m9_perimetral_registros` | Semanal |
| M10 Cosecha y Liberación (`/inocuidad/cosecha`) | `m10_cosecha_liberacion` | Por evento |
| M11 Pre-operacional Cosecha (`/inocuidad/preoperacional`) | `m11_preoperacional_registros` | Diaria |
| M12 Limpieza de Baños (`/inocuidad/limpieza-banos`) | `m12_limpieza_banos` | Diaria |

---

## 6. Patrón de módulos de inocuidad (M6 → replicar en M8-M12)

M6 y M7 establecen el patrón. Para implementar M8-M12:

### Estructura de carpetas
```
src/hooks/use<Modulo>.ts              ← hook de datos
src/lib/pdf/m<N>/
  ├── <Modulo>PDF.tsx                 ← componentes: <Modulo>Pagina + <Modulo>PDF + <Modulo>ConsolidadoPDF
  ├── generar<Modulo>PDF.tsx          ← descarga individual
  └── generar<Modulo>ConsolidadoPDF.tsx ← descarga consolidada por rango de fechas
src/app/screens/<Modulo>.tsx          ← pantalla (reemplaza el mock actual)
```

### Hook de datos (copiar de useBotiquin.ts)
```typescript
// Filtra por profile.org_id (nunca del usuario)
// select('*, ranchos(nombre, codigo)').eq('org_id', profile.org_id)
// Devuelve { registros/inspecciones, loading, error, refetch }
```

**M7 tiene grouping adicional:** las filas se agrupan por `rancho_id + fecha` para formar inspecciones. M8 (por evento, 1 fila = 1 registro) NO necesita grouping.

### Componente PDF (copiar de BotiquinPDF.tsx)
```typescript
// <Modulo>Pagina → 1 página A4 con formato oficial
// <Modulo>PDF → Document con 1 página (individual)
// <Modulo>ConsolidadoPDF → Document con N páginas (una por registro)
// Footer fijo en cada página: "AgroCampo — DuoMind Solutions & Hima"
// Fuente: Helvetica (sin Unicode — usar 'Si'/'No', no ✓/✗)
```

### Pantalla (copiar de BotiquinPrimerosAuxilios.tsx)
- Header con ChevronLeft + título + ícono
- Botón "Exportar consolidado" (abre bottom sheet)
- Lista de registros como cards con chip de estado + botón PDF
- FAB (+) abre bottom sheet formulario (85% altura)
- Validación de rancho requerido + prevención proactiva del límite de frecuencia
- Guardar → INSERT → refetch → generar PDF → try/catch con toast

### Restricciones de frecuencia (triggers en Postgres)
Las restricciones viven en BD, no solo en el frontend:
- **M6:** `BOTIQUIN_LIMITE_SEMANAL` — 1 registro por rancho cada 7 días
- **M7:** `M7_LIMITE_QUINCENAL` — 1 inspección por rancho cada 14 días (permite varias filas misma fecha)
- M8-M12: triggers similares a crear en la BD

**Manejo en frontend:**
1. Prevención proactiva: query en el `useEffect` del formulario, mostrando banner `--agro-warning-fill` y deshabilitando el botón guardar
2. Captura del error: `mensaje.includes('<NOMBRE_TRIGGER>')` → `toast.warning(parsearErrorLimite(mensaje), { duration: 7000 })`
3. La función `parsearErrorLimite` extrae fechas del mensaje con regex `/\d{2}\/\d{2}\/\d{4}/g`

---

## 7. Generación de PDF y Excel

### PDF (client-side, @react-pdf/renderer)
- Componente de página reutilizable (individual + consolidado)
- Generador: `pdf(<Componente />).toBlob()` → `URL.createObjectURL()` → `<a>.click()` → `URL.revokeObjectURL()`
- Fuente: Helvetica. **No usar caracteres Unicode** (✓, ✗, →) — Helvetica no los soporta. Usar 'Si', 'No', etc.
- Nombre de archivo: `<modulo>-<fechaSlug>-<ranchoSlug>.pdf`

### Excel (client-side, exceljs)
- Requiere polyfill `buffer` en el browser: `if (!globalThis.Buffer) { const { Buffer } = await import('buffer'); globalThis.Buffer = Buffer }`
- `generarExcelHistorial(apps, nombreArchivo)`: 2 hojas — "Historial" (tabla con filtros automáticos) y "Formato oficial" (replica el formato BPA con bloques por aplicación)
- Exportación disponible desde DetalleAplicacion y Historial (para múltiples aplicaciones)

---

## 8. Esquema de BD — tablas principales

Ver `src/types/database.types.ts` para la definición completa. Resumen:

| Tabla | Descripción |
|-------|-------------|
| `organizaciones` | Tenants del SaaS |
| `profiles` | Usuarios (uno por auth.user), `org_id` nullable |
| `productores` | Perfil de productor, join con profiles |
| `ranchos` | Fincas por productor. `codigo` único |
| `catalogo_productos` | Global. 7 categorías, campos RSCO, días cosecha, dosis |
| `aplicaciones` | M1 — 24 columnas (fenología, EPP x5, caldos, etc.) |
| `aplicacion_productos` | Detalle de productos por aplicación M1 |
| `inventario_movimientos` | Auditoría de stock: entrada/salida/ajuste |
| `m6_botiquin` | 5 campos boolean + metadata |
| `m7_vidrio_plastico` | Una fila por material. area, material_equipo, protegido, estado, observaciones |
| `m8_fertilizacion` | Por evento. sector, método, superficie, dosis |
| `m9_perimetral_*` | Dos tablas: config de ítems + registros por día |
| `m10_cosecha_liberacion` | Trazabilidad: bandeja, lote, comprobante, destino |
| `m11_preoperacional_registros` | Por día: SI/NO/NA + código correctivo |
| `m12_limpieza_banos` | Por evento: limpieza, desinfección, concentración, sustancias[] |

**Vistas SQL:**
- `v_inventario_saldo_rancho` — saldo por rancho + producto
- `v_inventario_saldo_productor` — saldo por productor + producto

**Funciones SQL:**
- `saldo_inventario(rancho_id, producto_id)` → saldo actual
- `completar_registro_organizacion(p_nombre_org)` → crea org + perfil admin_org + productor (atómico)

---

## 9. Convenciones de código

- **pnpm exclusivamente** — nunca `npm` ni `yarn`
- Path alias `@` → `./src` (configurado en vite.config.ts)
- Componentes en PascalCase: `RegistroAplicacion.tsx`
- Hooks en camelCase con prefijo `use`: `useRegistro.ts`
- Tipos en PascalCase con sufijo Type/Interface: `RegistroType`
- Carpetas en kebab-case: `registro-aplicacion/`
- **NO hardcodear colores** — usar variables CSS del design system
- Comentarios en español
- **Commits sin co-autoría de IA en el mensaje** (sin líneas `Co-Authored-By`)
- RLS obligatorio en cualquier tabla nueva
- Inserts siempre propagan `org_id` desde el contexto de auth

---

## 10. Pendientes conocidos

1. **Home.tsx** — muestra datos mock hardcodeados (Carlos Alvarez Naranjo, Rancho El Solar, métricas ficticias). Falta cablearlo a datos reales de la organización del usuario autenticado.

2. **M8-M12** — pantallas con UI estática. Cada una necesita: hook, funciones en `queries.ts`, guardar en BD, generadores PDF, y trigger de restricción de frecuencia.

3. **Validación del catálogo ANEBERRIES con Hima** — hay puntos pendientes: dosis marcadas como "No especificada en lista", categorización de algunos productos.

4. **Sistema de invitación de usuarios** — para agregar miembros a una organización existente (equipos multi-usuario). No implementado.

5. **Suscripciones y pagos (Stripe)** — plans existen en el esquema pero sin implementar cobro.

6. **Deploy a Vercel** — pendiente. Requiere configurar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` solo para Edge Functions o seeds — **nunca en variables frontend de Vercel ni en git**
   - `.env` ya está en `.gitignore`

7. **Soporte offline** — no implementado (IndexedDB + banner + sync).

8. **Tests** — no configurados.

---

## 11. Skills de diseño instaladas

En `.claude/skills/` y `.agents/skills/`:
- `emil-design-eng` — filosofía de polish UI y detalles invisibles
- `impeccable` — auditoría y mejora de interfaces
- `design-taste-frontend` — landing pages, rediseños, anti-slop

Usarlas con `/skill-name` cuando se requiera trabajo de diseño. Respetar el design system existente (tokens CSS, mobile-first, minimalismo sin sombras).

---

## 12. Bugs resueltos

### Recarga de página colgaba infinitamente (Mayo 2026)
**Causa:** `onAuthStateChange` disparaba `SIGNED_IN` al recuperar sesión del localStorage, generando múltiples instancias de `GoTrueClient`.
**Solución:**
- `storageKey: 'agrocampo-auth'` único en `supabase.ts`
- Estrategia mixta: `getSession()` al montar + `onAuthStateChange` solo para eventos nuevos
- Eliminar todas las instancias extra de `createClient` fuera de `supabase.ts`

---

*Última actualización: 13 junio 2026 — DuoMind Solutions*
