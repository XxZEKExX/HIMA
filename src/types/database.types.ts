// Tipos TypeScript generados manualmente desde supabase/migrations/001_initial_schema.sql
// Actualizar si se agregan columnas o tablas nuevas.

export type Rol = 'super_admin' | 'admin_hima' | 'asesor_tecnico' | 'operario'
export type CategoriaProducto = 'Fungicidas' | 'Insecticidas' | 'Adherentes' | 'Herbicidas' | 'Reguladores' | 'Biorracionales' | 'Nematicidas'
export type UnidadProducto = 'kg' | 'L'
export type Fenologia = 'establecimiento' | 'floracion' | 'cuajado' | 'engorde' | 'produccion' | 'cosecha'
export type TipoAplicacion = 'Foliar' | 'Drench'
export type TipoEquipo = 'bomba-motor' | 'bomba-manual' | 'aspersora-mochila'
export type CondicionMeteorologica = 'Nublado' | 'Muy soleado' | 'Parcialmente soleado' | 'Lluvioso' | 'Lluvioso y nublado' | 'Viento' | 'Humedad'
export type StatusAplicacion = 'borrador' | 'completado'
export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste'
export type NivelInfestacion = 'Bajo' | 'Medio' | 'Alto'
export type EstadoVidrio = 'Bueno' | 'Deteriorado' | 'Reemplazo'
export type MetodoFertilizacion = 'Fertirriego' | 'Drench' | 'Band'
export type ItemPerimetral = 'periferia_huerto' | 'fuente_canal' | 'fuente_reservorio' | 'fuente_pozo' | 'almacen_instalaciones' | 'intrusion_animal'
export type ResultadoPerimetral = 'S' | 'X'
export type SeccionPreoperacional = 'area_cosecha' | 'banos' | 'lavamanos' | 'higiene_personal' | 'material_empaque' | 'area_consumo' | 'salud_trabajador' | 'area_empaque_carga' | 'contenedores_reusables'
export type ResultadoPreoperacional = 'SI' | 'NO' | 'NA'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nombre_completo: string
          rol: Rol
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nombre_completo: string
          rol: Rol
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre_completo?: string
          rol?: Rol
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      productores: {
        Row: {
          id: string
          profile_id: string
          asesor_id: string | null
          responsable_inocuidad_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          asesor_id?: string | null
          responsable_inocuidad_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          asesor_id?: string | null
          responsable_inocuidad_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      ranchos: {
        Row: {
          id: string
          productor_id: string
          nombre: string
          codigo: string
          cultivo: string
          superficie_ha: number | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          productor_id: string
          nombre: string
          codigo: string
          cultivo: string
          superficie_ha?: number | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          productor_id?: string
          nombre?: string
          codigo?: string
          cultivo?: string
          superficie_ha?: number | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      catalogo_productos: {
        Row: {
          id: string
          nombre_comercial: string
          ingrediente_activo: string
          concentracion: string | null
          empresa: string | null
          rsco: string | null
          categoria: CategoriaProducto
          dias_cosecha: number | null
          reentrada_hrs: number | null
          dosis_ha: number | null
          dosis_200l: number | null
          unidad: UnidadProducto | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre_comercial: string
          ingrediente_activo: string
          concentracion?: string | null
          empresa?: string | null
          rsco?: string | null
          categoria: CategoriaProducto
          dias_cosecha?: number | null
          reentrada_hrs?: number | null
          dosis_ha?: number | null
          dosis_200l?: number | null
          unidad?: UnidadProducto | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre_comercial?: string
          ingrediente_activo?: string
          concentracion?: string | null
          empresa?: string | null
          rsco?: string | null
          categoria?: CategoriaProducto
          dias_cosecha?: number | null
          reentrada_hrs?: number | null
          dosis_ha?: number | null
          dosis_200l?: number | null
          unidad?: UnidadProducto | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      aplicaciones: {
        Row: {
          id: string
          productor_id: string
          rancho_id: string
          variedad: string | null
          sector: string | null
          superficie_ha: number | null
          fenologia: Fenologia | null
          fecha_recomendacion: string | null
          fecha_aplicacion: string
          hora_inicio: string | null
          hora_fin: string | null
          tipo_aplicacion: TipoAplicacion
          equipo: TipoEquipo | null
          total_agua_l: number | null
          cloracion: boolean
          cloro_cantidad_l: number | null
          cloro_ph: number | null
          condicion_meteorologica: CondicionMeteorologica | null
          epp_traje: boolean
          epp_guantes: boolean
          epp_googles: boolean
          epp_botas: boolean
          epp_mascarillas: boolean
          caldos_sobrantes: boolean
          caldos_cantidad_l: number | null
          caldos_agua_lavado_l: number | null
          caldos_area_designada: boolean | null
          aplicadores: string | null
          asesor_id: string | null
          responsable_inocuidad_id: string | null
          observaciones: string | null
          status: StatusAplicacion
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          productor_id: string
          rancho_id: string
          variedad?: string | null
          sector?: string | null
          superficie_ha?: number | null
          fenologia?: Fenologia | null
          fecha_recomendacion?: string | null
          fecha_aplicacion: string
          hora_inicio?: string | null
          hora_fin?: string | null
          tipo_aplicacion: TipoAplicacion
          equipo?: TipoEquipo | null
          total_agua_l?: number | null
          cloracion?: boolean
          cloro_cantidad_l?: number | null
          cloro_ph?: number | null
          condicion_meteorologica?: CondicionMeteorologica | null
          epp_traje?: boolean
          epp_guantes?: boolean
          epp_googles?: boolean
          epp_botas?: boolean
          epp_mascarillas?: boolean
          caldos_sobrantes?: boolean
          caldos_cantidad_l?: number | null
          caldos_agua_lavado_l?: number | null
          caldos_area_designada?: boolean | null
          aplicadores?: string | null
          asesor_id?: string | null
          responsable_inocuidad_id?: string | null
          observaciones?: string | null
          status?: StatusAplicacion
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          productor_id?: string
          rancho_id?: string
          variedad?: string | null
          sector?: string | null
          superficie_ha?: number | null
          fenologia?: Fenologia | null
          fecha_recomendacion?: string | null
          fecha_aplicacion?: string
          hora_inicio?: string | null
          hora_fin?: string | null
          tipo_aplicacion?: TipoAplicacion
          equipo?: TipoEquipo | null
          total_agua_l?: number | null
          cloracion?: boolean
          cloro_cantidad_l?: number | null
          cloro_ph?: number | null
          condicion_meteorologica?: CondicionMeteorologica | null
          epp_traje?: boolean
          epp_guantes?: boolean
          epp_googles?: boolean
          epp_botas?: boolean
          epp_mascarillas?: boolean
          caldos_sobrantes?: boolean
          caldos_cantidad_l?: number | null
          caldos_agua_lavado_l?: number | null
          caldos_area_designada?: boolean | null
          aplicadores?: string | null
          asesor_id?: string | null
          responsable_inocuidad_id?: string | null
          observaciones?: string | null
          status?: StatusAplicacion
          created_at?: string
          updated_at?: string
        }
      }

      aplicacion_productos: {
        Row: {
          id: string
          aplicacion_id: string
          producto_id: string
          plaga_objetivo: string | null
          nivel_infestacion: NivelInfestacion | null
          dosis_ha: number | null
          dosis_200l: number | null
          total_producto: number | null
          dias_cosecha: number | null
          reentrada_hrs: number | null
          created_at: string
        }
        Insert: {
          id?: string
          aplicacion_id: string
          producto_id: string
          plaga_objetivo?: string | null
          nivel_infestacion?: NivelInfestacion | null
          dosis_ha?: number | null
          dosis_200l?: number | null
          total_producto?: number | null
          dias_cosecha?: number | null
          reentrada_hrs?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          aplicacion_id?: string
          producto_id?: string
          plaga_objetivo?: string | null
          nivel_infestacion?: NivelInfestacion | null
          dosis_ha?: number | null
          dosis_200l?: number | null
          total_producto?: number | null
          dias_cosecha?: number | null
          reentrada_hrs?: number | null
          created_at?: string
        }
      }

      inventario_movimientos: {
        Row: {
          id: string
          rancho_id: string
          producto_id: string
          tipo: TipoMovimiento
          cantidad: number
          balance: number
          aplicacion_id: string | null
          referencia: string | null
          notas: string | null
          fecha: string
          registrado_por: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rancho_id: string
          producto_id: string
          tipo: TipoMovimiento
          cantidad: number
          balance: number
          aplicacion_id?: string | null
          referencia?: string | null
          notas?: string | null
          fecha: string
          registrado_por: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rancho_id?: string
          producto_id?: string
          tipo?: TipoMovimiento
          cantidad?: number
          balance?: number
          aplicacion_id?: string | null
          referencia?: string | null
          notas?: string | null
          fecha?: string
          registrado_por?: string
          created_at?: string
          updated_at?: string
        }
      }

      m6_botiquin: {
        Row: {
          id: string
          rancho_id: string
          fecha_verificacion: string
          paracetamol: boolean
          guantes_s: boolean
          guantes_m: boolean
          guantes_l: boolean
          vendas_tijeras: boolean
          gasas_cinta: boolean
          desinfectante: boolean
          responsable_id: string | null
          firma_verificacion: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rancho_id: string
          fecha_verificacion: string
          paracetamol?: boolean
          guantes_s?: boolean
          guantes_m?: boolean
          guantes_l?: boolean
          vendas_tijeras?: boolean
          gasas_cinta?: boolean
          desinfectante?: boolean
          responsable_id?: string | null
          firma_verificacion?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rancho_id?: string
          fecha_verificacion?: string
          paracetamol?: boolean
          guantes_s?: boolean
          guantes_m?: boolean
          guantes_l?: boolean
          vendas_tijeras?: boolean
          gasas_cinta?: boolean
          desinfectante?: boolean
          responsable_id?: string | null
          firma_verificacion?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      m7_vidrio_plastico: {
        Row: {
          id: string
          rancho_id: string
          fecha: string
          area: string
          material_equipo: string
          protegido: boolean
          estado: EstadoVidrio
          observaciones: string | null
          registrado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rancho_id: string
          fecha: string
          area: string
          material_equipo: string
          protegido: boolean
          estado: EstadoVidrio
          observaciones?: string | null
          registrado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rancho_id?: string
          fecha?: string
          area?: string
          material_equipo?: string
          protegido?: boolean
          estado?: EstadoVidrio
          observaciones?: string | null
          registrado_por?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      m8_fertilizacion: {
        Row: {
          id: string
          rancho_id: string
          fecha: string
          sector: string | null
          nombre_comercial: string
          ingrediente_activo: string | null
          concentracion: string | null
          metodo: MetodoFertilizacion
          superficie_ha: number
          dosis_kg_l_ha: number
          cantidad_total: number
          operario_id: string | null
          verificacion_semanal: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rancho_id: string
          fecha: string
          sector?: string | null
          nombre_comercial: string
          ingrediente_activo?: string | null
          concentracion?: string | null
          metodo: MetodoFertilizacion
          superficie_ha: number
          dosis_kg_l_ha: number
          cantidad_total: number
          operario_id?: string | null
          verificacion_semanal?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rancho_id?: string
          fecha?: string
          sector?: string | null
          nombre_comercial?: string
          ingrediente_activo?: string | null
          concentracion?: string | null
          metodo?: MetodoFertilizacion
          superficie_ha?: number
          dosis_kg_l_ha?: number
          cantidad_total?: number
          operario_id?: string | null
          verificacion_semanal?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      m9_perimetral_config: {
        Row: {
          id: string
          rancho_id: string
          mes: string
          tiene_almacen: boolean
          responsable_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rancho_id: string
          mes: string
          tiene_almacen?: boolean
          responsable_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          rancho_id?: string
          mes?: string
          tiene_almacen?: boolean
          responsable_id?: string | null
          created_at?: string
        }
      }

      m9_perimetral_registros: {
        Row: {
          id: string
          rancho_id: string
          mes: string
          dia: number
          item_clave: ItemPerimetral
          resultado: ResultadoPerimetral | null
          registrado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rancho_id: string
          mes: string
          dia: number
          item_clave: ItemPerimetral
          resultado?: ResultadoPerimetral | null
          registrado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rancho_id?: string
          mes?: string
          dia?: number
          item_clave?: ItemPerimetral
          resultado?: ResultadoPerimetral | null
          registrado_por?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      m10_cosecha_liberacion: {
        Row: {
          id: string
          rancho_id: string
          fecha: string
          sector: string | null
          cantidad_bandejas: number | null
          lote_liberado: boolean
          numero_comprobante: string | null
          codigo_trazabilidad: string | null
          marca_embalaje: string | null
          destino_final: string | null
          fruta_proceso_kg: number | null
          encargado_liberacion_id: string | null
          hora_inicio_cosecha: string | null
          hora_fin_cosecha: string | null
          verificacion_semanal: boolean
          observaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rancho_id: string
          fecha: string
          sector?: string | null
          cantidad_bandejas?: number | null
          lote_liberado?: boolean
          numero_comprobante?: string | null
          codigo_trazabilidad?: string | null
          marca_embalaje?: string | null
          destino_final?: string | null
          fruta_proceso_kg?: number | null
          encargado_liberacion_id?: string | null
          hora_inicio_cosecha?: string | null
          hora_fin_cosecha?: string | null
          verificacion_semanal?: boolean
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rancho_id?: string
          fecha?: string
          sector?: string | null
          cantidad_bandejas?: number | null
          lote_liberado?: boolean
          numero_comprobante?: string | null
          codigo_trazabilidad?: string | null
          marca_embalaje?: string | null
          destino_final?: string | null
          fruta_proceso_kg?: number | null
          encargado_liberacion_id?: string | null
          hora_inicio_cosecha?: string | null
          hora_fin_cosecha?: string | null
          verificacion_semanal?: boolean
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      m11_preoperacional_registros: {
        Row: {
          id: string
          rancho_id: string
          mes: string
          dia: number
          seccion: SeccionPreoperacional
          item_clave: string
          resultado: ResultadoPreoperacional | null
          codigo_correctivo: string | null
          registrado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rancho_id: string
          mes: string
          dia: number
          seccion: SeccionPreoperacional
          item_clave: string
          resultado?: ResultadoPreoperacional | null
          codigo_correctivo?: string | null
          registrado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rancho_id?: string
          mes?: string
          dia?: number
          seccion?: SeccionPreoperacional
          item_clave?: string
          resultado?: ResultadoPreoperacional | null
          codigo_correctivo?: string | null
          registrado_por?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      m12_limpieza_banos: {
        Row: {
          id: string
          rancho_id: string
          fecha: string
          bano_numero: string
          limpieza: boolean
          desinfeccion: boolean
          concentracion_ppm: number
          sustancias: string[]
          abasto_papel: boolean
          succion: boolean
          realizado_por_id: string | null
          firma_semanal: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rancho_id: string
          fecha: string
          bano_numero: string
          limpieza?: boolean
          desinfeccion?: boolean
          concentracion_ppm?: number
          sustancias?: string[]
          abasto_papel?: boolean
          succion?: boolean
          realizado_por_id?: string | null
          firma_semanal?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rancho_id?: string
          fecha?: string
          bano_numero?: string
          limpieza?: boolean
          desinfeccion?: boolean
          concentracion_ppm?: number
          sustancias?: string[]
          abasto_papel?: boolean
          succion?: boolean
          realizado_por_id?: string | null
          firma_semanal?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Aliases de conveniencia por tabla
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Productor = Database['public']['Tables']['productores']['Row']
export type ProductorInsert = Database['public']['Tables']['productores']['Insert']
export type ProductorUpdate = Database['public']['Tables']['productores']['Update']

export type Rancho = Database['public']['Tables']['ranchos']['Row']
export type RanchoInsert = Database['public']['Tables']['ranchos']['Insert']
export type RanchoUpdate = Database['public']['Tables']['ranchos']['Update']

export type CatalogoProducto = Database['public']['Tables']['catalogo_productos']['Row']
export type CatalogoProductoInsert = Database['public']['Tables']['catalogo_productos']['Insert']
export type CatalogoProductoUpdate = Database['public']['Tables']['catalogo_productos']['Update']

export type Aplicacion = Database['public']['Tables']['aplicaciones']['Row']
export type AplicacionInsert = Database['public']['Tables']['aplicaciones']['Insert']
export type AplicacionUpdate = Database['public']['Tables']['aplicaciones']['Update']

export type AplicacionProducto = Database['public']['Tables']['aplicacion_productos']['Row']
export type AplicacionProductoInsert = Database['public']['Tables']['aplicacion_productos']['Insert']
export type AplicacionProductoUpdate = Database['public']['Tables']['aplicacion_productos']['Update']

export type InventarioMovimiento = Database['public']['Tables']['inventario_movimientos']['Row']
export type InventarioMovimientoInsert = Database['public']['Tables']['inventario_movimientos']['Insert']
export type InventarioMovimientoUpdate = Database['public']['Tables']['inventario_movimientos']['Update']

// Tipo compuesto: aplicación con productos (para vistas de detalle)
export type AplicacionConProductos = Aplicacion & {
  aplicacion_productos: (AplicacionProducto & {
    catalogo_productos: CatalogoProducto
  })[]
}

// Tipo rico: aplicación con todos los joins necesarios para PDF y Excel
export type AplicacionRica = Aplicacion & {
  ranchos: Rancho
  productores: {
    id: string
    profile_id: string
    profiles: { nombre_completo: string }
  }
  asesor: { nombre_completo: string } | null
  responsable: { nombre_completo: string } | null
  aplicacion_productos: (AplicacionProducto & {
    catalogo_productos: CatalogoProducto
  })[]
}
