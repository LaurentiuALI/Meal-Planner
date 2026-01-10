"use client"

import { useState } from "react"
import { searchOpenFoodFacts, searchOpenFoodFactsByBarcode, type OFFProduct } from "@/actions/openfoodfacts"
import { useIngredientStore } from "@/store/useIngredientStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Ingredient } from "@/types"
import { Loader2, Search, Download, Barcode, Plus } from "lucide-react"
import { BarcodeScanner } from "./barcode-scanner"

interface OFFSearchDialogProps {
  onSelect: (ingredientData: Omit<Ingredient, "id">) => void
}

export function OFFSearchDialog({ onSelect }: OFFSearchDialogProps) {
  const [open, setOpen] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<OFFProduct[]>([])
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null)
  
  const { ingredients } = useIngredientStore()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setUnknownBarcode(null)
    const data = await searchOpenFoodFacts(query)
    setResults(data)
    setLoading(false)
  }

  const handleScan = async (code: string) => {
    setShowScanner(false)
    setQuery(code)
    setUnknownBarcode(null)
    
    // 1. Check local store
    const localMatch = ingredients.find(i => i.barcodes?.includes(code))
    if (localMatch) {
        alert(`You already have this ingredient: ${localMatch.name}`)
        return
    }

    setLoading(true)
    
    // 2. Search OFF
    const data = await searchOpenFoodFactsByBarcode(code)
    
    if (data.length > 0) {
        setResults(data)
    } else {
        setResults([]) 
        setUnknownBarcode(code)
    }
    setLoading(false)
  }

  const handleCreateCustom = () => {
     if (!unknownBarcode) return
     
     const newIngredient: Omit<Ingredient, "id"> = {
         name: "New Product",
         unit: "g",
         macros: { protein: 0, carbs: 0, fat: 0, calories: 0, fiber: 0 },
         purchaseUnit: { name: "Pack", amount: 100 },
         barcodes: [unknownBarcode]
     }
     
     onSelect(newIngredient)
     setOpen(false)
     setUnknownBarcode(null)
     setQuery("")
  }

  const handleSelect = (product: OFFProduct) => {
    // Try to parse purchase unit amount from quantity string (e.g. "500g")
    let purchaseAmount = 100 // default
    if (product.quantity) {
      const match = product.quantity.match(/(\d+)/)
      if (match) {
        purchaseAmount = parseInt(match[0], 10)
      }
    }

    const ingredientData: Omit<Ingredient, "id"> = {
      name: product.product_name,
      unit: "g", // OFF standardizes on 100g
      macros: {
        calories: product.nutriments["energy-kcal_100g"] || 0,
        protein: product.nutriments["proteins_100g"] || 0,
        carbs: product.nutriments["carbohydrates_100g"] || 0,
        fat: product.nutriments["fat_100g"] || 0,
        fiber: product.nutriments["fiber_100g"] || 0,
      },
      purchaseUnit: {
        name: "pack",
        amount: purchaseAmount,
      },
      barcodes: product.code ? [product.code] : []
    }

    onSelect(ingredientData)
    setOpen(false)
    setQuery("")
    setResults([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Search className="mr-2 h-4 w-4" /> Import from Web
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Open Food Facts</DialogTitle>
          <DialogDescription>
            Find ingredients and automatically import nutritional data.
          </DialogDescription>
        </DialogHeader>

        {showScanner && (
            <BarcodeScanner 
                onScanSuccess={handleScan} 
                onClose={() => setShowScanner(false)} 
            />
        )}

        <div className="flex gap-2 my-2">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <Input
                placeholder="Search by name or barcode..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
            </form>
            <Button 
                variant="outline" 
                onClick={() => setShowScanner(true)}
                title="Scan Barcode"
            >
                <Barcode className="h-4 w-4" />
            </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {results.length === 0 && !loading && !unknownBarcode && (
            <div className="text-center text-muted-foreground py-8">
              No results found. Try a different search term.
            </div>
          )}
          
          {unknownBarcode && !loading && (
             <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                    Barcode <strong>{unknownBarcode}</strong> not found in Open Food Facts.
                </p>
                <Button onClick={handleCreateCustom}>
                    <Plus className="mr-2 h-4 w-4" /> Create Custom Ingredient
                </Button>
             </div>
          )}
          
          <div className="space-y-2">
            {results.map((product, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{product.product_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {product.quantity || "Unknown size"} • 
                    {product.nutriments["energy-kcal_100g"]} kcal/100g
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                    <span>P: {Number(product.nutriments["proteins_100g"] ?? 0).toFixed(1)}g</span>
                    <span>C: {Number(product.nutriments["carbohydrates_100g"] ?? 0).toFixed(1)}g</span>
                    <span>F: {Number(product.nutriments["fat_100g"] ?? 0).toFixed(1)}g</span>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleSelect(product)}>
                  <Download className="mr-2 h-4 w-4" /> Import
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
