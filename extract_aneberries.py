"""
extract_aneberries.py
Extrae catálogo de productos autorizados ANEBERRIES desde PDFs binarios
usando pdfplumber.extract_tables(). Genera un JSON por cultivo.

Uso:
    python extract_aneberries.py

Salida:
    aneberries_frambuesa.json
    aneberries_fresa.json
    aneberries_moraazul.json
    extraccion_reporte.txt
"""

import json
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit("Instala pdfplumber: pip install pdfplumber")

BASE_DIR = Path(__file__).parent

# ---------------------------------------------------------------------------
# Configuración por cultivo
# ---------------------------------------------------------------------------
CULTIVOS = [
    {
        "pdf":         BASE_DIR / "705450906-Aneberries-Frambuesa-EU-2324.pdf",
        "cultivo":     "Frambuesa",
        "mercado":     "UE",
        "revision":    "22",
        "fecha_lista": "2023-07-15",
        "salida":      BASE_DIR / "aneberries_frambuesa.json",
    },
    {
        "pdf":         BASE_DIR / "666263486-Aneberries-Fresa.pdf",
        "cultivo":     "Fresa",
        "mercado":     "UE",
        "revision":    "19",
        "fecha_lista": "2020-07-15",
        "salida":      BASE_DIR / "aneberries_fresa.json",
    },
    {
        "pdf":         BASE_DIR / "666262648-Aneberries.pdf",
        "cultivo":     "Mora azul",
        "mercado":     "UE",
        "revision":    "19",
        "fecha_lista": "2020-07-15",
        "salida":      BASE_DIR / "aneberries_moraazul.json",
    },
]

SECCION_RE = re.compile(r"[IVX]+\.\-\s*(.+?)(?:\n|$)", re.IGNORECASE)
SECCION_NOMBRE = {
    "INSECTICIDAS":   "Insecticidas",
    "FUNGICIDAS":     "Fungicidas",
    "HERBICIDAS":     "Herbicidas",
    "BIORRACIONALES": "Biorracionales",
    "RODENTICIDAS":   "Rodenticidas",
    "NEMATICIDAS":    "Nematicidas",
    "ACARICIDAS":     "Acaricidas",
}

RSCO_RE = re.compile(r"(RSCO-[A-Z0-9\-\.\/]+)", re.IGNORECASE)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def clean(s):
    if s is None:
        return None
    s = str(s).replace("\n", " ").strip()
    s = re.sub(r"\(cid:\d+\)", "", s).strip()
    return s or None


def detect_seccion(text: str):
    """
    Devuelve nombre normalizado de sección si el texto es un encabezado.
    Soporta el caso especial 'I.- INSECTICIDAS\nVI.-RODENTICIDAS'.
    """
    if not text:
        return None
    matches = SECCION_RE.findall(text)
    if not matches:
        return None
    # Tomar el ÚLTIMO match (en caso de "I.- INSECTICIDAS\nVI.-RODENTICIDAS")
    nombre_upper = matches[-1].strip().upper()
    for key, val in SECCION_NOMBRE.items():
        if key in nombre_upper:
            return val
    return None


def strip_seccion_prefix(text: str):
    """Quita el prefijo de sección (p.ej. 'I.- INSECTICIDAS\n') de una celda."""
    if not text:
        return text
    m = SECCION_RE.match(text)
    if m:
        return text[m.end():].strip()
    return text


def is_page_header_row(row):
    """True si la fila es el encabezado repetido de página (título o nombres de columnas)."""
    if not row or len(row) < 2:
        return True
    c0 = str(row[0] or "")
    c1 = str(row[1] or "")
    c2 = str(row[2] if len(row) > 2 else "")
    # Fila de título ANEBERRIES
    if c0 in ("", ) and ("ANEBERRIES" in c2 or "EN CUMPLIMIENTO" in c2):
        return True
    # Fila de nombres de columna
    if c0 == "INGREDIENTE ACTIVO" or c1 == "NOMBRE COMERCIAL":
        return True
    # Fila mixta de encabezado (residuo de salto de página en col0)
    if "INGREDIENTE ACTIVO" in c0 and "NOMBRE COMERCIAL" in c1:
        return True
    return False


def is_section_only_row(row):
    """True si la fila ES exclusivamente un encabezado de sección."""
    if not row:
        return False
    non_none = [c for c in row[1:] if c is not None and str(c).strip()]
    if non_none:
        return False
    c0 = str(row[0] or "")
    return detect_seccion(c0) is not None


def is_notes_row(row):
    """True si la fila es texto de notas al pie / leyenda."""
    c0 = str(row[0] or "")
    if c0.startswith("NOTAS:") or c0.startswith("ANEBERRIES A.C.,"):
        return True
    if len(row) > 1 and row[1] and re.search(r"N DE RESISTENCIA A LOS", str(row[1])):
        return True
    return False


def is_plaga_continuation_row(row):
    """
    True si la fila de ≤3 columnas es una fila de continuación de plagas
    (no un producto), p.ej. ['Gusano falso medidor', 'Trichoplusia ni', '12'].
    Heurística: col0 en título/minúsculas, col1 parece nombre científico latino.
    """
    if len(row) > 4:
        return False
    c0 = str(row[0] or "")
    c1 = str(row[1] or "")
    if not c0:
        return True  # fila completamente vacía o sin nombre de producto
    # Si col1 parece nombre científico (dos palabras, primera mayúscula, segunda minúscula)
    if re.match(r"^[A-Z][a-z]+ [a-z]", c1):
        return True
    # Si col0 parece nombre común de plaga (sin números, sin "/" entre marcas)
    if not re.search(r"\d|%|CE$|WG$|SC$|SL$|WP$|DF$|GD$|EC$|EW$", c0, re.IGNORECASE):
        if re.match(r"^[A-Z][a-záéíóúñ ]+$", c0, re.IGNORECASE) and len(c0) < 40:
            return True
    return False


def classify_subtable(table):
    """
    Clasifica una tabla de pocas columnas:
    - 'product_nc_shifted': col0=NC, col1=conc, col2=empresa, col3=dosis, ...
    - 'plaga_continuation': datos de plagas (no procesar como productos)
    - 'skip': notas u otros
    Retorna ('skip', None) o ('product_nc_shifted', ncols) o ('plaga_continuation', None).
    """
    if not table:
        return 'skip', None
    # Encontrar primera fila con datos
    first_data = None
    for row in table:
        if row and any(c and str(c).strip() for c in row):
            first_data = row
            break
    if not first_data:
        return 'skip', None

    ncols = len(first_data)
    if ncols <= 2:
        return 'skip', None

    if ncols == 3:
        # Verificar si son filas de plagas (col1 científico) o notas
        if is_plaga_continuation_row(first_data):
            return 'plaga_continuation', None
        return 'skip', None

    # 4-8 cols: probablemente subtabla de productos (NC shifted)
    # Verificar que col1 parezca una concentración (número)
    c1 = str(first_data[1] or "")
    if re.search(r"\d", c1):
        return 'product_nc_shifted', ncols
    return 'skip', None


def parse_dosis(texto):
    """
    Extrae dosis_min, dosis_max y unidad del texto literal.
    Solo usa el primer rango numérico del texto (antes de "/" o "por").
    Esto evita incluir volúmenes de dilución como "1000 L de agua".
    """
    if not texto:
        return None, None, None
    t = texto.strip()

    # Truncar ante separadores de volumen de dilución: "ml / 1000 L", "gr / 200 L"
    t_trabajo = re.split(r"\s*/\s*\d|\sde\s+agua|\spor\s+\d+\s*[Ll]", t)[0].strip()

    t_lower = t_trabajo.lower()
    unidad = None
    if re.search(r"\bkg\b", t_lower):
        unidad = "kg"
    elif re.search(r"\bl\b(?!\w)|\blitros?\b", t_lower):
        unidad = "L"
    elif re.search(r"\bgr?\b|\bgramos?\b", t_lower):
        unidad = "kg"
    elif re.search(r"\bml\b|\bmililitros?\b", t_lower):
        unidad = "L"

    # Intentar extraer rango: "112.5 A 137.5", "0.8-1.0", "300 - 400"
    range_m = re.search(
        r"(\d+(?:[.,]\d+)?)\s*[-–aA]\s*(\d+(?:[.,]\d+)?)",
        t_trabajo
    )
    if range_m:
        try:
            v1 = float(range_m.group(1).replace(",", "."))
            v2 = float(range_m.group(2).replace(",", "."))
            return min(v1, v2), max(v1, v2), unidad
        except ValueError:
            pass

    # Sin rango: tomar el primer número
    m = re.search(r"\d+(?:[.,]\d+)?", t_trabajo)
    if m:
        try:
            v = float(m.group().replace(",", "."))
            return v, v, unidad
        except ValueError:
            pass

    return None, None, unidad


def extract_rsco(observaciones):
    if not observaciones:
        return None
    m = RSCO_RE.search(str(observaciones))
    return m.group(1) if m else None


def safe_int(s):
    if s is None:
        return None
    m = re.search(r"\d+", str(s))
    return int(m.group()) if m else None


# ---------------------------------------------------------------------------
# Extracción de una fila de datos → dict autorización + dato catálogo
# ---------------------------------------------------------------------------

def process_row_standard(row, current_ia, current_seccion, page_num):
    """
    Procesa una fila en formato estándar de 14 columnas.
    col0=IA, col1=NC, col2=conc, col3=empresa, col4=dosis, col5=intv_seg,
    col6=plaga_c, col7=plaga_f, col8=reentrada, col9=lmr, col10=clasif,
    col11=grupo_q, col12=intv_apl, col13=obs.
    Devuelve (ia_nuevo, nc, dict_cat_partial, dict_auth) o None si inválido.
    """
    def col(n):
        return row[n] if len(row) > n else None

    ia_raw    = clean(col(0))
    nc_raw    = clean(col(1))
    conc      = clean(col(2))
    empresa   = clean(col(3))
    dosis_t   = clean(col(4))
    intv_s    = clean(col(5))
    plaga_c   = clean(col(6))
    plaga_f   = clean(col(7))
    reentrada = clean(col(8))
    lmr       = clean(col(9))
    _clasif   = clean(col(10))
    grupo_q   = clean(col(11))
    intv_apl  = clean(col(12))
    obs_raw   = clean(col(13))

    # Limpiar residuo de salto de página en col0
    if ia_raw and "INGREDIENTE ACTIVO" in ia_raw:
        ia_raw = None

    # Limpiar prefijo de sección en col6 (plaga_comun).
    # IMPORTANTE: el prefijo "I.- INSECTICIDAS" en col6 es un artefacto del
    # encabezado repetido de página y NO debe usarse para actualizar la sección.
    if plaga_c and detect_seccion(plaga_c):
        plaga_c = strip_seccion_prefix(plaga_c) or None

    # Resolver IA efectivo
    if ia_raw:
        ia_efectivo = ia_raw
    else:
        ia_efectivo = current_ia

    # Saltar si no hay NC
    if not nc_raw:
        # Actualizar IA del contexto aunque no haya NC
        return ia_efectivo or current_ia, None, None, None

    # Filtrar NCs que son fragmentos de continuación de nombre multilínea:
    # - empieza con "/"  → "/ CENTRIC 185.6 SC..."
    # - empieza con cifra + punto/espacio → "185.6 SC /...", "25 WG", "60 SC", "20 PS"
    # - es solo 1-2 mayúsculas → "WG", "WP", "SC"
    # - empieza con "SC /" o "WG /" → sufijo de formulación + barra
    if (nc_raw.startswith("/")
            or re.match(r"^\d+[\.\s]", nc_raw)
            or re.match(r"^[A-Z0-9]{1,2}$", nc_raw)
            or re.match(r"^[A-Z]{1,3}\s*/", nc_raw)):
        return ia_efectivo, None, None, None

    rsco = extract_rsco(obs_raw)
    dmin, dmax, unidad = parse_dosis(dosis_t)

    cat_partial = {
        "nombre_comercial":  nc_raw,
        "ingrediente_activo": ia_efectivo,
        "concentracion":     conc,
        "empresa":           empresa,
        "rsco":              rsco,
        "unidad":            unidad,
    }
    auth = {
        "producto_key":             {"nombre_comercial": nc_raw,
                                     "ingrediente_activo": ia_efectivo},
        "intervalo_seguridad_dias": safe_int(intv_s),
        "reentrada_hrs":            safe_int(reentrada),
        "lmr_ppm":                  lmr,
        "dosis_texto":              dosis_t,
        "dosis_min":                dmin,
        "dosis_max":                dmax,
        "intervalo_aplicacion":     intv_apl,
        "grupo_quimico":            grupo_q,
        "plaga_comun":              plaga_c,
        "plaga_cientifica":         plaga_f,
        "observaciones":            obs_raw,
    }
    return ia_efectivo, None, cat_partial, auth


def process_row_nc_shifted(row, current_ia, ncols_table):
    """
    Procesa una fila de sub-tabla de productos donde col0=NC (sin columna IA).
    col0=NC, col1=conc, col2=empresa, col3=dosis, col4=intv_seg,
    col5=plaga_c, col6=plaga_f, col7=reentrada.
    """
    def col(n):
        return row[n] if len(row) > n else None

    nc_raw    = clean(col(0))
    conc      = clean(col(1))
    empresa   = clean(col(2))
    dosis_t   = clean(col(3))
    intv_s    = clean(col(4)) if ncols_table > 4 else None
    plaga_c   = clean(col(5)) if ncols_table > 5 else None
    plaga_f   = clean(col(6)) if ncols_table > 6 else None
    reentrada = clean(col(7)) if ncols_table > 7 else None

    if not nc_raw:
        return None, None
    # Saltar filas de plagas por error de clasificación
    if is_plaga_continuation_row(row):
        return None, None

    ia_efectivo = current_ia
    rsco = None
    dmin, dmax, unidad = parse_dosis(dosis_t)

    cat_partial = {
        "nombre_comercial":  nc_raw,
        "ingrediente_activo": ia_efectivo,
        "concentracion":     conc,
        "empresa":           empresa,
        "rsco":              rsco,
        "unidad":            unidad,
    }
    auth = {
        "producto_key":             {"nombre_comercial": nc_raw,
                                     "ingrediente_activo": ia_efectivo},
        "intervalo_seguridad_dias": safe_int(intv_s),
        "reentrada_hrs":            safe_int(reentrada),
        "lmr_ppm":                  None,
        "dosis_texto":              dosis_t,
        "dosis_min":                dmin,
        "dosis_max":                dmax,
        "intervalo_aplicacion":     None,
        "grupo_quimico":            None,
        "plaga_comun":              plaga_c,
        "plaga_cientifica":         plaga_f,
        "observaciones":            None,
    }
    return cat_partial, auth


# ---------------------------------------------------------------------------
# Extracción principal por PDF
# ---------------------------------------------------------------------------

def extract_pdf(cfg):
    pdf_path    = cfg["pdf"]
    cultivo     = cfg["cultivo"]
    mercado     = cfg["mercado"]
    revision    = cfg["revision"]
    fecha_lista = cfg["fecha_lista"]

    catalogo       = []
    autorizaciones = []
    seen_productos = {}  # (nc_upper, ia_upper) → index en catalogo

    current_seccion = None
    current_ia      = None

    filas_sin_dosis            = []
    filas_categoria_sospechosa = []

    def add_entry(cat_partial, auth, page_num):
        nonlocal current_seccion
        categoria = current_seccion or "Desconocida"
        if categoria == "Desconocida":
            filas_categoria_sospechosa.append(
                f"Pag {page_num}: NC='{cat_partial['nombre_comercial'][:30]}' sin sección"
            )

        nc  = cat_partial["nombre_comercial"]
        ia  = cat_partial["ingrediente_activo"] or ""
        key = (nc.upper(), ia.upper())

        if key not in seen_productos:
            cat_entry = {**cat_partial, "categoria": categoria}
            seen_productos[key] = len(catalogo)
            catalogo.append(cat_entry)
        else:
            idx = seen_productos[key]
            if not catalogo[idx].get("rsco") and cat_partial.get("rsco"):
                catalogo[idx]["rsco"] = cat_partial["rsco"]
            if not catalogo[idx].get("empresa") and cat_partial.get("empresa"):
                catalogo[idx]["empresa"] = cat_partial["empresa"]
            if not catalogo[idx].get("unidad") and cat_partial.get("unidad"):
                catalogo[idx]["unidad"] = cat_partial["unidad"]

        full_auth = {
            **auth,
            "cultivo":        cultivo,
            "mercado":        mercado,
            "revision_lista": revision,
            "fecha_lista":    fecha_lista,
        }
        autorizaciones.append(full_auth)

        if not auth.get("dosis_texto"):
            filas_sin_dosis.append(
                f"  {cultivo} | Pag {page_num} | {nc[:30]:30s} | IA: {ia[:25]}"
            )

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()

            for table in tables:
                if not table:
                    continue

                ncols_table = len(table[0]) if table[0] else 0

                # --- Sub-tablas de pocas columnas ---
                if ncols_table < 12:
                    kind, ncols = classify_subtable(table)
                    if kind == 'skip' or kind == 'plaga_continuation':
                        continue
                    if kind == 'product_nc_shifted':
                        for row in table:
                            if not row or not any(c and str(c).strip() for c in row):
                                continue
                            cat_p, auth = process_row_nc_shifted(row, current_ia, ncols)
                            if cat_p and auth:
                                add_entry(cat_p, auth, page_num)
                    continue

                # --- Tabla estándar (≥12 columnas) ---
                for row in table:
                    if not row or len(row) < 2:
                        continue
                    if is_page_header_row(row):
                        continue
                    if is_notes_row(row):
                        continue

                    c0 = str(row[0] or "")

                    # Detectar encabezado de sección standalone
                    if is_section_only_row(row):
                        new_sec = detect_seccion(c0)
                        if new_sec:
                            current_seccion = new_sec
                        continue

                    # Procesar fila de datos
                    new_ia, _unused, cat_p, auth = process_row_standard(
                        row, current_ia, current_seccion, page_num
                    )
                    # Actualizar IA del contexto
                    if new_ia:
                        current_ia = new_ia

                    if cat_p and auth:
                        add_entry(cat_p, auth, page_num)

    reporte = {
        "cultivo":                   cultivo,
        "total_productos":           len(catalogo),
        "total_autorizaciones":      len(autorizaciones),
        "categorias_detectadas":     sorted(set(p["categoria"] for p in catalogo)),
        "productos_sin_dosis":       filas_sin_dosis,
        "filas_categoria_sospechosa": filas_categoria_sospechosa,
        "dosis_texto_nulas":         sum(1 for a in autorizaciones if not a.get("dosis_texto")),
        "intervalo_seguridad_nulos": sum(1 for a in autorizaciones if a.get("intervalo_seguridad_dias") is None),
    }
    return catalogo, autorizaciones, reporte


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    reportes_globales = []

    for cfg in CULTIVOS:
        print(f"\nProcesando {cfg['cultivo']} ({cfg['pdf'].name})...")
        if not cfg["pdf"].exists():
            print(f"  ERROR: no se encontró el PDF: {cfg['pdf']}")
            continue

        catalogo, autorizaciones, reporte = extract_pdf(cfg)

        output = {
            "meta": {
                "fuente":         "ANEBERRIES Lista de Productos Autorizados",
                "cultivos":       [cfg["cultivo"]],
                "generado_desde": "PDF via pdfplumber.extract_tables()",
                "nota":           "Datos extraídos automáticamente, pendientes de validación por Hima",
            },
            "catalogo_productos":      catalogo,
            "producto_autorizaciones": autorizaciones,
        }

        with open(cfg["salida"], "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"  -> {cfg['salida'].name}")
        reportes_globales.append(reporte)

    # --- Reporte de texto ---
    reporte_path = BASE_DIR / "extraccion_reporte.txt"
    lines = ["=" * 70, "REPORTE DE EXTRACCIÓN ANEBERRIES", "=" * 70, ""]

    for r in reportes_globales:
        lines.append(f"CULTIVO: {r['cultivo']}")
        lines.append(f"  Productos en catálogo:     {r['total_productos']}")
        lines.append(f"  Autorizaciones:            {r['total_autorizaciones']}")
        lines.append(f"  dosis_texto nulas:         {r['dosis_texto_nulas']}")
        lines.append(f"  intervalo_seguridad nulos: {r['intervalo_seguridad_nulos']}")
        lines.append(f"  Categorías detectadas:     {r['categorias_detectadas']}")

        if r["productos_sin_dosis"]:
            lines.append(f"\n  PRODUCTOS SIN DOSIS ({len(r['productos_sin_dosis'])} filas):")
            lines.extend(f"    {x}" for x in r["productos_sin_dosis"])

        if r["filas_categoria_sospechosa"]:
            lines.append(f"\n  CATEGORÍAS SOSPECHOSAS ({len(r['filas_categoria_sospechosa'])}):")
            lines.extend(f"    {x}" for x in r["filas_categoria_sospechosa"])

        lines.append("")

    lines += [
        "=" * 70,
        "NOTAS PARA REVISIÓN ANTES DE CARGAR A SUPABASE",
        "=" * 70,
        "",
        "1. RODENTICIDAS (Frambuesa): 'Rodenticidas' no está en el CHECK de",
        "   categorías válidas del seed actual. Ampliar el CHECK antes de cargar.",
        "",
        "2. DOSIS VACÍAS: Las filas con dosis_texto nulo/vacío son blancos",
        "   REALES en el PDF — no errores de extracción. Decidir valor antes de",
        "   cargar (dosis_texto es NOT NULL en BD).",
        "",
        "3. HERBICIDAS con encabezados repetidos (PARAQUAT, DIURON, GLIFOSATO,",
        "   PARAQUAT+DIURON): verificar en los JSON que categoria='Herbicidas'.",
        "",
        "4. Categoría 'Biorracionales' puede no estar en enum de BD; verificar.",
        "",
        "5. Sub-tablas de pocas columnas en Fresa (pág.1 ABAMECTINA block,",
        "   pág.19 BIORRACIONALES): intv_apl, obs, lmr, grupo_quimico son null",
        "   para esos productos — completar manualmente si es necesario.",
    ]

    with open(reporte_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\nReporte guardado en: {reporte_path.name}")
    for line in lines:
        print(line)


if __name__ == "__main__":
    main()
