# Auditoría de Seguridad — AgroCampo

**Fecha:** 14 junio 2026  
**Alcance:** Código del cliente React/TypeScript + integración Supabase  
**Proyecto Supabase:** `glrjesvtsspilkacooln`  
**Revisó:** Revisión estática de código fuente  
**Estado:** BORRADOR — pendiente de confirmación antes de aplicar correcciones

---

## Resumen ejecutivo

El código fuente del frontend está bien estructurado en general. No se encontró inyección SQL, ni secretos hardcodeados en `src/`, ni `org_id` derivado de input del usuario. Los hallazgos más relevantes son de **defensa en profundidad** (varias queries de lectura dependen únicamente de RLS sin filtro redundante de `org_id`) y de **validación de entrada** (campos numéricos aceptan texto arbitrario que produce `NaN` antes de llegar a la BD). No se encontró ninguna vulnerabilidad crítica directamente explotable desde el frontend.

---

## 1. Inyección SQL / Queries

### ✅ OK — Todas las queries usan el cliente Supabase parametrizado

Revisado: `src/lib/queries.ts`, todos los hooks (`useBotiquin`, `useVidrioPlastico`, `useM8Fertilizacion`, `useHomeDashboard`, `useInventario`, etc.), y todas las pantallas con acceso directo a Supabase (`BotiquinPrimerosAuxilios`, `InspeccionVidrioPlastico`, `RegistroFertilizacion`, `Inventario`).

**Resultado:** Cero queries construyen SQL concatenando strings con input del usuario. Todas usan la API del cliente Supabase (`.from()`, `.select()`, `.eq()`, `.in()`, `.gte()`, `.lt()`, `.insert()`, `.update()`, `.upsert()`).

### ✅ OK — Búsquedas / filtros de texto son client-side, no SQL

Los únicos "filtros de texto" son en JavaScript del cliente sobre datos ya cargados:

| Archivo | Línea | Patrón |
|---------|-------|--------|
| `src/app/screens/Inventario.tsx` | 358–370 | `saldosRancho.filter(i => i.nombre_comercial.toLowerCase().includes(q))` |
| `src/app/screens/InspeccionVidrioPlastico.tsx` | 101–104 | `suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))` |
| `src/app/screens/RegistroFertilizacion.tsx` | ~97–99 | `catalogo.filter(f => f.nombre_comercial.toLowerCase().includes(value))` |

El término de búsqueda **nunca se interpola en SQL**. No se usa `.ilike()` ni ninguna otra forma de búsqueda server-side con input del usuario. Los tres patrones anteriores son seguros.

---

## 2. Funciones RPC / SECURITY DEFINER

### ✅ OK (bajo riesgo) — `saldo_inventario`

**Llamada:** `src/lib/queries.ts:252`
```typescript
supabase.rpc('saldo_inventario', {
  p_rancho_id: ranchoId,   // UUID interno, no texto del usuario
  p_producto_id: productoId // UUID interno, no texto del usuario
})
```
Ambos parámetros son UUIDs derivados del estado interno de la app (hooks `useRanchos`, `useCatalogoProductos`), no texto libre del usuario. Riesgo bajo.

### ⚠️ MEDIO — `completar_registro_organizacion` — requiere auditoría de la función SQL

**Llamada:** `src/app/screens/CompletarOrganizacion.tsx:31`
```typescript
supabase.rpc('completar_registro_organizacion', {
  p_nombre_org: nombreOrg.trim(),  // texto libre del usuario
})
```

**Lo que se sabe desde el cliente:**
- El parámetro recibe el nombre de la organización ingresado por el usuario (texto libre, sin límite de longitud en el frontend).
- Se aplica `.trim()` antes de enviar.
- La función crea org + perfil + productor de forma atómica.

**Lo que NO se puede verificar desde el frontend:**
- Si la función PL/pgSQL usa `p_nombre_org` en un `EXECUTE` dinámico (SQL dinámico sin sanitizar) o solo en INSERTs parametrizados normales.
- Si la función valida la longitud del parámetro.
- Si tiene `SECURITY DEFINER` y cuál es su `search_path`.

**Corrección sugerida (a verificar en BD):**
1. Confirmar que la función solo usa `INSERT INTO organizaciones (nombre) VALUES (p_nombre_org)` — no `EXECUTE format(...)` con la variable.
2. Agregar `SET search_path = public, pg_temp` al definir la función para prevenir ataques de search_path.
3. Agregar validación de longitud dentro de la función: `IF length(p_nombre_org) > 200 THEN RAISE EXCEPTION ...`.

---

## 3. Exposición de `org_id` y aislamiento multi-tenant

### ✅ OK — Los INSERTs siempre usan `profile.org_id` del contexto de auth

Revisado todos los archivos con operaciones de escritura:

| Archivo | `org_id` viene de |
|---------|-------------------|
| `BotiquinPrimerosAuxilios.tsx:213` | `profile.org_id` ✓ |
| `InspeccionVidrioPlastico.tsx:414, 515, 518` | `profile.org_id` ✓ |
| `RegistroFertilizacion.tsx:455, 485, 718, 772` | `profile.org_id` ✓ |
| `NuevaAplicacion.tsx:177` | `profile!.org_id!` ✓ |
| `Inventario.tsx:590` | `profile.org_id` pasado como prop ✓ |
| `queries.ts:134, 287, 315` | parámetro `orgId` que siempre viene de `profile.org_id` en el callsite ✓ |

Ningún `org_id` proviene de URL params, query strings, localStorage, formularios, ni ninguna otra fuente manipulable por el usuario.

### ⚠️ MEDIO — Varias queries de lectura dependen únicamente de RLS, sin filtro `org_id` explícito en el query

Las siguientes funciones en `queries.ts` **no incluyen `.eq('org_id', ...)` en el query**, confiando exclusivamente en las políticas RLS de Supabase para el aislamiento entre tenants:

| Función | Archivo/Línea | Filtro en query |
|---------|--------------|-----------------|
| `getAplicaciones()` | `queries.ts:82` | Solo `productor_id` (opcional) |
| `getAplicacionById()` | `queries.ts:97` | Solo `id` |
| `getAplicacionesRicas()` | `queries.ts:156` | Solo `productor_id` (opcional) |
| `getAplicacionRicaById()` | `queries.ts:171` | Solo `id` |
| `actualizarRancho()` | `queries.ts:45` | Solo `id` |
| `desactivarRancho()` | `queries.ts:56` | Solo `id` |
| `getMovimientosProducto()` | `queries.ts:232` | Solo `producto_id` |
| `actualizarNombreCompleto()` | `queries.ts:199` | Solo `id` (auth user id) |

**Impacto real:** Si las políticas RLS en Supabase están correctamente configuradas (que es lo esperado), esto no es explotable. Sin embargo, es un único punto de fallo: cualquier error en la configuración de RLS (política mal escrita, tabla sin RLS habilitado, rol con `BYPASSRLS`) expone datos de todas las organizaciones.

**Principio de defensa en profundidad:** La buena práctica es que el código de aplicación también filtre explícitamente por `org_id`, independientemente de RLS. Así una capa compensa si la otra falla.

**Corrección sugerida (bajo prioridad si RLS está bien):**
```typescript
// Antes
export async function getAplicacionById(id: string) {
  return supabase.from('aplicaciones').select(...).eq('id', id).single()
}

// Después (requiere org_id como parámetro o tomarlo del contexto)
export async function getAplicacionById(id: string, orgId: string) {
  return supabase.from('aplicaciones').select(...).eq('id', id).eq('org_id', orgId).single()
}
```

> **Acción inmediata recomendada:** Verificar en el panel de Supabase que todas las tablas con `org_id` tienen RLS habilitado y que cada política `SELECT` incluye `org_id = get_my_org_id()` o equivalente.

---

## 4. Credenciales y secretos

### ✅ OK — Solo la anon key está en el frontend

`src/lib/supabase.ts:4-5` usa correctamente `import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_ANON_KEY`. Ninguna variable `VITE_*` en `.env` expone la service role key (las variables `VITE_` se incluyen en el bundle del cliente).

### ✅ OK — Service role key solo en scripts de servidor, nunca en `src/`

La `SUPABASE_SERVICE_ROLE_KEY` aparece en:
- `.env` — leída vía `process.env.SUPABASE_SERVICE_ROLE_KEY` (no `import.meta.env`), solo usada por scripts Node
- `scripts/seed-aneberries-zarzamora.ts:22` y `scripts/seed-aneberries-todos.ts` — scripts de seed que corren en Node, no se incluyen en el bundle de Vite

No hay ninguna referencia a la service role key en ningún archivo bajo `src/`.

### ✅ OK — `.env` está en `.gitignore`

`.gitignore:3`: la línea `.env` está presente y correctamente evita que se commitee.

### ✅ OK — Sin secretos hardcodeados en el código

Búsqueda de patrones JWT (`eyJ`), `service_role`, `password` con valores reales en `src/`: **cero coincidencias** con credenciales reales. Las únicas apariciones de `password` son los parámetros de función y el campo del formulario de login (semánticamente correctas).

### ✅ OK — Sin archivos `.env.example` con valores reales

No existe `.env.example` en el repo. El único `.env` es el local gitignoreado.

---

## 5. Validación de entrada

### ⚠️ BAJO-MEDIO — Campos numéricos aceptan texto arbitrario sin guard `isNaN`

Algunos formularios no validan que el string del input produzca un número válido antes de hacer `parseFloat`:

**`NuevaAplicacion.tsx:150, 158, 160, 161, 169, 170, 189-193`**
```typescript
superficie_ha: formData.surface ? parseFloat(formData.surface) : null,
total_agua_l: formData.totalWater ? parseFloat(formData.totalWater) : null,
cloro_cantidad_l: formData.chlorineQuantity ? parseFloat(formData.chlorineQuantity) : null,
```
Si el usuario escribe `"abc"` (string no vacío), `Boolean("abc") === true` pasa la guarda, pero `parseFloat("abc") === NaN`. El resultado `NaN` se enviaría a Supabase. Postgres rechazará el valor para columnas `numeric`, devolviendo un error de BD — no hay riesgo de corrupción silenciosa, pero produce errores crípticos en lugar de mensajes de validación claros.

**`RegistroFertilizacion.tsx:441-442`** sí valida correctamente:
```typescript
superficie: !f.superficie || parseFloat(f.superficie) <= 0,
```
`parseFloat("abc") <= 0` es `NaN <= 0 === false`, entonces la validación **pasa incorrectamente** si el usuario escribe texto no numérico. El `!f.superficie` tampoco lo atrapa porque `"abc"` es truthy.

**Corrección sugerida:**
```typescript
// Helper reutilizable
function validarPositivo(s: string): boolean {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0
}

// En handleGuardar de RegistroFertilizacion:
superficie: !f.superficie || !validarPositivo(f.superficie),
dosis: !f.dosis || !validarPositivo(f.dosis),
```

### ✅ OK — `Inventario.tsx` valida cantidad correctamente

`Inventario.tsx:173-174`:
```typescript
const cantidad = parseFloat(form.cantidad)
if (!cantidad || cantidad <= 0) { toast.error("La cantidad debe ser mayor a 0"); return }
```
Aquí `!cantidad` atrapa tanto `NaN` (falsy) como `0`. Correcto.

### ✅ OK — `MiOrganizacion.tsx` valida `isNaN` explícitamente

`MiOrganizacion.tsx:91-92`:
```typescript
const sup = parseFloat(form.superficie_ha)
if (!form.superficie_ha || isNaN(sup) || sup <= 0) e.superficie_ha = 'Debe ser mayor a 0'
```
Patrón correcto.

---

## 6. Hallazgos adicionales

### ⚠️ BAJO — `console.log` con datos de autenticación activos en producción

`src/hooks/useAuth.ts:35, 42, 55, 59, 66, 77, 86, 95, 126, 140, 167` contiene 15+ llamadas a `console.log/warn/error` que registran en la consola del navegador: ID de usuario, roles, errores de auth, y resultados de queries.

Cualquier usuario que abra DevTools ve estos datos. En producción esto facilita el reconocimiento del flujo de autenticación a un atacante con acceso físico o que tome una captura de pantalla.

**Corrección sugerida:** Reemplazar con condicional de entorno:
```typescript
const devLog = import.meta.env.DEV ? console.log : () => {}
// o usar una librería de logs con niveles
```

### ⚠️ BAJO — TOCTOU en cálculo de balance de inventario (no explotable, solo integridad)

`queries.ts:260-290` — `registrarMovimiento()`:
1. Llama `getSaldoActual()` → obtiene saldo actual
2. Calcula `balance = saldoActual + delta`
3. Inserta el movimiento con ese `balance` calculado

Si dos movimientos concurrentes del mismo usuario corren simultáneamente, ambos leerían el mismo saldo base y calcularían balances incorrectos. El campo `balance` en `inventario_movimientos` quedaría desincronizado.

**Impacto de seguridad:** Ninguno — no permite extraer datos ni escalar privilegios. Solo es un riesgo de integridad de datos.

**Si el saldo autoritativo lo calcula la vista SQL** (`v_inventario_saldo_rancho`) sumando los movimientos, el balance almacenado es solo informativo y el impacto es cosmético.

**Corrección sugerida (baja prioridad):** Mover el cálculo de balance a la BD (trigger o función SQL) para garantizar atomicidad, eliminando el campo `balance` de la inserción del cliente.

### ℹ️ INFO — `src/imports/pasted_text/agro-campo-forms.md`

Existe un archivo de notas de diseño dentro de `src/`. No contiene credenciales ni datos sensibles (revisado). No es un riesgo de seguridad, pero idealmente debería estar fuera del `src/` o en `.gitignore`.

---

## Resumen de hallazgos

| # | Categoría | Archivo / Ubicación | Severidad | Estado |
|---|-----------|---------------------|-----------|--------|
| 1 | Inyección SQL | Todos los archivos con queries | ✅ OK | Sin hallazgos |
| 2 | RPC `saldo_inventario` | `queries.ts:252` | ✅ OK | Bajo riesgo, parámetros son UUIDs internos |
| 3 | RPC `completar_registro_organizacion` | `CompletarOrganizacion.tsx:31` | ⚠️ Medio | Auditar función SQL en BD — parámetro es texto libre |
| 4 | `org_id` en inserts | Todos los archivos | ✅ OK | Siempre de `profile.org_id` del contexto de auth |
| 5 | Queries de lectura sin filtro `org_id` | `queries.ts:82, 97, 156, 171, 45, 56, 232, 199` | ⚠️ Medio | Dependen únicamente de RLS — falta defensa en profundidad |
| 6 | Service role key en frontend | `src/lib/supabase.ts` | ✅ OK | No está en frontend, solo en scripts de servidor |
| 7 | Secretos en código fuente | `src/` completo | ✅ OK | No se encontraron credenciales hardcodeadas |
| 8 | `.env` en `.gitignore` | `.gitignore:3` | ✅ OK | Correctamente excluido |
| 9 | Validación numérica — `NuevaAplicacion` | `NuevaAplicacion.tsx:150–193` | ⚠️ Bajo-Medio | Sin guard `isNaN` — puede enviar `NaN` a BD |
| 10 | Validación numérica — `RegistroFertilizacion` | `RegistroFertilizacion.tsx:441–442` | ⚠️ Bajo-Medio | Texto no numérico pasa validación incorrectamente |
| 11 | `console.log` en producción | `src/hooks/useAuth.ts` | ⚠️ Bajo | Expone flujo de auth en DevTools |
| 12 | TOCTOU balance inventario | `queries.ts:260–290` | ℹ️ Info | Solo integridad, no explotable como vulnerabilidad |

---

## Acciones recomendadas (en orden de prioridad)

1. **[Medio — Inmediato]** Auditar en Supabase la función `completar_registro_organizacion`: confirmar que no usa SQL dinámico (`EXECUTE`) con el parámetro `p_nombre_org`, que tiene `SET search_path` seguro, y que valida longitud del input.

2. **[Medio — Inmediato]** Verificar en el dashboard de Supabase que RLS está habilitado en **todas** las tablas con `org_id` y que cada política `SELECT` filtra por `get_my_org_id()`. Tablas a revisar: `aplicaciones`, `aplicacion_productos`, `inventario_movimientos`, `ranchos`, `productores`, `m6_botiquin`, `m7_vidrio_plastico`, `m8_fertilizacion`, `fertilizantes_org`, `inventario_fertilizantes`, `m9_*`, `m10_*`, `m11_*`, `m12_*`.

3. **[Medio — Próximo sprint]** Agregar filtros redundantes de `org_id` a las funciones en `queries.ts` listadas en el hallazgo #5, pasando `orgId` como parámetro desde el callsite (donde ya se tiene `profile.org_id`).

4. **[Bajo-Medio — Próximo sprint]** Agregar helper `validarPositivo(s: string): boolean` con `Number.isFinite` y aplicarlo en `NuevaAplicacion.tsx` y `RegistroFertilizacion.tsx`.

5. **[Bajo — Cleanup]** Reemplazar los `console.log` de debug en `useAuth.ts` con un helper condicionado a `import.meta.env.DEV`.

---

*Auditoría estática — no sustituye pruebas de penetración ni revisión de configuración RLS en Supabase.*  
*DuoMind Solutions — AgroCampo*
