"use client"

import { useState } from "react"
import { useIngredientStore } from "@/store/useIngredientStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Ingredient } from "@/types"
import { Barcode, X } from "lucide-react"
import { BarcodeScanner } from "./barcode-scanner"

interface IngredientFormProps {
  initialData?: Ingredient | Omit<Ingredient, "id">
  onSuccess?: (ingredient?: Ingredient) => void
}

export function IngredientForm({ initialData, onSuccess }: IngredientFormProps) {
  const addIngredient = useIngredientStore((state) => state.addIngredient)
  const updateIngredient = useIngredientStore((state) => state.updateIngredient)
  const [showScanner, setShowScanner] = useState(false)

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    protein: initialData?.macros.protein || 0,
    carbs: initialData?.macros.carbs || 0,
    fat: initialData?.macros.fat || 0,
    calories: initialData?.macros.calories || 0,
    fiber: initialData?.macros.fiber || 0,
    unit: initialData?.unit || "g",
    purchaseUnitName: initialData?.purchaseUnit.name || "pack",
    purchaseUnitAmount: initialData?.purchaseUnit.amount || 500,
    barcodes: initialData?.barcodes || [],
  })
  
  const [barcodeInput, setBarcodeInput] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent bubbling to parent forms (like RecipeForm)

    const ingredientData = {
      name: formData.name,
      unit: formData.unit,
      macros: {
        protein: Number(formData.protein),
        carbs: Number(formData.carbs),
        fat: Number(formData.fat),
        calories: Number(formData.calories),
        fiber: Number(formData.fiber),
      },
      purchaseUnit: {
        name: formData.purchaseUnitName,
        amount: Number(formData.purchaseUnitAmount),
      },
      barcodes: formData.barcodes,
    }

    let resultIngredient: Ingredient | undefined;

    if (initialData && 'id' in initialData) {
      await updateIngredient(initialData.id, ingredientData)
    } else {
      resultIngredient = await addIngredient(ingredientData)
    }

    onSuccess?.(resultIngredient)
  }

  const addBarcode = (code: string) => {
    if (code && !formData.barcodes.includes(code)) {
      setFormData(prev => ({ ...prev, barcodes: [...prev.barcodes, code] }))
    }
    setBarcodeInput("")
    setShowScanner(false)
  }

  const removeBarcode = (code: string) => {
    setFormData(prev => ({ ...prev, barcodes: prev.barcodes.filter(b => b !== code) }))
  }

  const isEditing = initialData && 'id' in initialData

  return (
    <>
      {showScanner && (
        <BarcodeScanner
          onScanSuccess={addBarcode}
          onClose={() => setShowScanner(false)}
        />
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        
        {/* Barcode Section */}
        <div className="space-y-2">
           <Label>Associated Barcodes</Label>
           <div className="flex flex-wrap gap-2 mb-2">
             {formData.barcodes.map(code => (
               <div key={code} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                 <Barcode className="h-3 w-3 text-muted-foreground" />
                 <span>{code}</span>
                 <button 
                   type="button" 
                   onClick={() => removeBarcode(code)}
                   className="hover:text-destructive"
                 >
                   <X className="h-3 w-3" />
                 </button>
               </div>
             ))}
             {formData.barcodes.length === 0 && (
                <span className="text-sm text-muted-foreground italic">No barcodes associated.</span>
             )}
           </div>
           <div className="flex gap-2">
             <Input 
               placeholder="Scan or enter barcode" 
               value={barcodeInput}
               onChange={(e) => setBarcodeInput(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   e.preventDefault()
                   addBarcode(barcodeInput)
                 }
               }}
             />
             <Button type="button" variant="outline" onClick={() => addBarcode(barcodeInput)} disabled={!barcodeInput}>
               Add
             </Button>
             <Button type="button" variant="secondary" onClick={() => setShowScanner(true)}>
               <Barcode className="h-4 w-4" />
             </Button>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="unit">Base Unit (e.g. g, ml)</Label>
            <Input
              id="unit"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calories">Calories (per 100 units)</Label>
            <Input
              id="calories"
              type="number"
              value={formData.calories}
              onChange={(e) => setFormData({ ...formData, calories: Number(e.target.value) })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="protein">Protein</Label>
            <Input
              id="protein"
              type="number"
              value={formData.protein}
              onChange={(e) => setFormData({ ...formData, protein: Number(e.target.value) })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carbs">Carbs</Label>
            <Input
              id="carbs"
              type="number"
              value={formData.carbs}
              onChange={(e) => setFormData({ ...formData, carbs: Number(e.target.value) })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fat">Fat</Label>
            <Input
              id="fat"
              type="number"
              value={formData.fat}
              onChange={(e) => setFormData({ ...formData, fat: Number(e.target.value) })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fiber">Fiber</Label>
            <Input
              id="fiber"
              type="number"
              value={formData.fiber}
              onChange={(e) => setFormData({ ...formData, fiber: Number(e.target.value) })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="purchaseUnitName">Purchase Unit (e.g. Pack)</Label>
            <Input
              id="purchaseUnitName"
              value={formData.purchaseUnitName}
              onChange={(e) => setFormData({ ...formData, purchaseUnitName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchaseUnitAmount">Amount in Unit (e.g. 500)</Label>
            <Input
              id="purchaseUnitAmount"
              type="number"
              value={formData.purchaseUnitAmount}
              onChange={(e) => setFormData({ ...formData, purchaseUnitAmount: Number(e.target.value) })}
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full">
          {isEditing ? "Update Ingredient" : "Add Ingredient"}
        </Button>
      </form>
    </>
  )
}
