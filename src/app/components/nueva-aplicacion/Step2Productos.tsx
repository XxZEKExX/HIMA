import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormField } from "../FormField";
import { FormSelect } from "../FormSelect";
import { useCatalogoProductos } from "@/hooks/useCatalogoProductos";

interface Props {
  formData: any;
  updateFormData: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const pestOptions = [
  { value: "botrytis", label: "Botrytis cinerea" },
  { value: "oidio", label: "Oidio" },
  { value: "trips", label: "Trips" },
  { value: "pulgon", label: "Pulgón" },
  { value: "arana", label: "Araña roja" },
  { value: "antracnosis", label: "Antracnosis" },
  { value: "otro", label: "Otro" },
];

const infestationLevels = ["Bajo", "Medio", "Alto"];

const emptyProduct = {
  productId: "",
  commercialName: "",
  activeIngredient: "",
  rsco: "",
  pest: "",
  infestationLevel: "",
  dosePerHa: "",
  dosePer200L: "",
  totalProduct: "",
  daysToHarvest: "",
  reentryTime: "",
};

function calcularTotal(dosePerHa: string, surface: string): string {
  const dose = parseFloat(dosePerHa);
  const sup = parseFloat(surface);
  if (!dose || !sup) return "";
  return (dose * sup).toFixed(4);
}

export function Step2Productos({ formData, updateFormData, onNext, onBack }: Props) {
  const { productos, loading: loadingCatalogo } = useCatalogoProductos();
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<typeof emptyProduct>({ ...emptyProduct });

  const productoOptions = productos.map((p) => ({
    value: p.id,
    label: p.nombre_comercial,
  }));

  const handleProductSelect = (productId: string) => {
    const selected = productos.find((p) => p.id === productId);
    if (!selected) return;

    const dosePerHa = selected.dosis_ha?.toString() ?? "";
    setCurrentProduct({
      ...currentProduct,
      productId: selected.id,
      commercialName: selected.nombre_comercial,
      activeIngredient: selected.ingrediente_activo,
      rsco: selected.rsco ?? "",
      dosePerHa,
      dosePer200L: selected.dosis_200l?.toString() ?? "",
      totalProduct: calcularTotal(dosePerHa, formData.surface),
      daysToHarvest: selected.dias_cosecha?.toString() ?? "",
      reentryTime: selected.reentrada_hrs?.toString() ?? "",
    });
  };

  const handleDosePerHaChange = (value: string) => {
    setCurrentProduct((prev) => ({
      ...prev,
      dosePerHa: value,
      totalProduct: calcularTotal(value, formData.surface),
    }));
  };

  const addProduct = () => {
    if (!currentProduct.productId) return;
    updateFormData({ products: [...formData.products, currentProduct] });
    setCurrentProduct({ ...emptyProduct });
    setIsAddingProduct(false);
  };

  const removeProduct = (index: number) => {
    updateFormData({
      products: formData.products.filter((_: any, i: number) => i !== index),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado de sección */}
      <div className="bg-agro-success-fill -mx-4 px-4 py-2">
        <h3 className="text-[13px] text-agro-success-text" style={{ fontWeight: 600 }}>
          PRODUCTOS APLICADOS
        </h3>
      </div>

      {/* Lista de productos agregados */}
      {formData.products.length > 0 && (
        <div className="space-y-3">
          {formData.products.map((product: any, index: number) => (
            <div key={index} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-sm mb-1" style={{ fontWeight: 600 }}>
                    {product.commercialName}
                  </div>
                  <div className="text-xs text-muted-foreground">{product.activeIngredient}</div>
                </div>
                <button
                  onClick={() => removeProduct(index)}
                  className="p-1 text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Dosis: {product.dosePerHa} kg/ha</span>
                {product.infestationLevel && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-1 bg-muted rounded">{product.infestationLevel}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulario para agregar producto */}
      {isAddingProduct ? (
        <div className="bg-card border-2 border-primary rounded-xl p-4 space-y-4">
          <FormSelect
            label={loadingCatalogo ? "Cargando productos..." : "Nombre comercial"}
            value={currentProduct.productId}
            onChange={handleProductSelect}
            options={productoOptions}
          />

          <FormField
            label="Ingrediente activo"
            value={currentProduct.activeIngredient}
            onChange={() => {}}
            disabled
          />

          <FormField
            label="Número RSCO/COFEPRIS"
            value={currentProduct.rsco}
            onChange={() => {}}
            disabled
          />

          <FormSelect
            label="Justificación / Plaga"
            value={currentProduct.pest}
            onChange={(value) => setCurrentProduct((prev) => ({ ...prev, pest: value }))}
            options={pestOptions}
          />

          {/* Nivel de infestación */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block" style={{ fontWeight: 600 }}>
              Nivel de infestación
            </label>
            <div className="flex gap-2">
              {infestationLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => setCurrentProduct((prev) => ({ ...prev, infestationLevel: level }))}
                  className={`flex-1 h-10 rounded-full transition-all ${
                    currentProduct.infestationLevel === level
                      ? "bg-primary text-white"
                      : "bg-card border border-border text-foreground"
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Dosis por ha"
              type="number"
              value={currentProduct.dosePerHa}
              onChange={handleDosePerHaChange}
              placeholder="kg/ha"
            />

            <FormField
              label="Dosis por 200L agua"
              type="number"
              value={currentProduct.dosePer200L}
              onChange={(value) => setCurrentProduct((prev) => ({ ...prev, dosePer200L: value }))}
              placeholder="g/200L"
            />
          </div>

          <FormField
            label="Total producto a usar (auto-calculado)"
            type="number"
            value={currentProduct.totalProduct}
            onChange={() => {}}
            disabled
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Días a cosecha"
              type="number"
              value={currentProduct.daysToHarvest}
              onChange={(value) => setCurrentProduct((prev) => ({ ...prev, daysToHarvest: value }))}
            />

            <FormField
              label="Tiempo reentrada (hrs)"
              type="number"
              value={currentProduct.reentryTime}
              onChange={(value) => setCurrentProduct((prev) => ({ ...prev, reentryTime: value }))}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setCurrentProduct({ ...emptyProduct });
                setIsAddingProduct(false);
              }}
              className="flex-1 h-12 border border-border text-foreground rounded-xl"
              style={{ fontWeight: 600 }}
            >
              Cancelar
            </button>
            <button
              onClick={addProduct}
              disabled={!currentProduct.productId}
              className="flex-1 h-12 bg-primary text-white rounded-xl hover:bg-agro-blue transition-colors disabled:opacity-50"
              style={{ fontWeight: 600 }}
            >
              Agregar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingProduct(true)}
          className="w-full h-14 border-2 border-dashed border-primary text-primary rounded-xl flex items-center justify-center gap-2 hover:bg-agro-success-fill transition-colors"
          style={{ fontWeight: 600 }}
        >
          <Plus className="w-5 h-5" />
          Agregar producto
        </button>
      )}

      {/* Botones de navegación */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 h-14 border border-border text-foreground rounded-3xl"
          style={{ fontWeight: 600 }}
        >
          Atrás
        </button>
        <button
          onClick={onNext}
          disabled={formData.products.length === 0}
          className="flex-1 h-14 bg-primary text-white rounded-3xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-agro-blue transition-colors"
          style={{ fontWeight: 600 }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
