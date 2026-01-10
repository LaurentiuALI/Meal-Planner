"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Trash2, Cloud, PlusCircle, Barcode } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Ingredient } from "@/types"
import { searchOpenFoodFacts, searchOpenFoodFactsByBarcode, type OFFProduct } from "@/actions/openfoodfacts"
import { useIngredientStore } from "@/store/useIngredientStore"
import { useDebounce } from "@/hooks/use-debounce"
import { BarcodeScanner } from "@/components/ingredients/barcode-scanner"
import { IngredientForm } from "@/components/ingredients/ingredient-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SmartIngredientRowProps {
  ingredientId: string
  amount: number | string
  allIngredients: Ingredient[]
  onChange: (updates: { ingredientId?: string; amount?: number }) => void
  onRemove: () => void
  isGhost?: boolean
}

function MacroPreview({ macros }: { macros: any }) {
  if (!macros) return null
  const p = Math.round(macros.protein || macros["proteins_100g"] || 0)
  const c = Math.round(macros.carbs || macros["carbohydrates_100g"] || 0)
  const f = Math.round(macros.fat || macros["fat_100g"] || 0)
  const kcal = Math.round(macros.calories || macros["energy-kcal_100g"] || 0)

  return (
    <div className="flex flex-wrap gap-2 mt-1.5 select-none pointer-events-none">
      <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-900">
        {kcal} kcal
      </span>
      <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-900">
        P: {p}g
      </span>
      <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
        C: {c}g
      </span>
      <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
        F: {f}g
      </span>
    </div>
  )
}

export function SmartIngredientRow({
  ingredientId,
  amount,
  allIngredients,
  onChange,
  onRemove,
  isGhost = false,
}: SmartIngredientRowProps) {
  const [open, setOpen] = React.useState(false)
  const [showScanner, setShowScanner] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [offResults, setOffResults] = React.useState<OFFProduct[]>([])
  const [isSearching, setIsSearching] = React.useState(false)

  const debouncedSearch = useDebounce(searchValue, 600)
  const { addIngredient } = useIngredientStore()

  const selectedIngredient = allIngredients.find((i) => i.id === ingredientId)

  // Clear web results when closing or selecting
  const resetSearch = () => {
    setOpen(false)
    setSearchValue("")
    setOffResults([])
  }

  React.useEffect(() => {
    async function performSearch() {
      if (debouncedSearch.length < 3) {
        setOffResults([])
        return
      }
      setIsSearching(true)
      try {
        const results = await searchOpenFoodFacts(debouncedSearch)
        setOffResults(results)
      } catch (e) {
        console.error(e)
      } finally {
        setIsSearching(false)
      }
    }
    performSearch()
  }, [debouncedSearch])

  const handleImport = async (product: OFFProduct) => {
    let purchaseAmount = 100
    if (product.quantity) {
      const match = product.quantity.match(/(\d+)/)
      if (match) purchaseAmount = parseInt(match[0], 10)
    }

    const ingredientData = {
      name: product.product_name,
      unit: "g",
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

    const newIngredient = await addIngredient(ingredientData)
    onChange({ ingredientId: newIngredient.id })
    resetSearch()
  }

  const handleScan = async (code: string) => {
    setShowScanner(false)

    // 1. Check local
    const localMatch = allIngredients.find(i => i.barcodes?.includes(code))
    if (localMatch) {
      onChange({ ingredientId: localMatch.id })
      // Don't close immediately if we want to confirm, but UX-wise selecting is what we expect
      return
    }

    // 2. Check OFF
    const offData = await searchOpenFoodFactsByBarcode(code)
    if (offData.length > 0) {
      await handleImport(offData[0])
    } else {
      alert("Product not found in local database or Open Food Facts.")
    }
  }

  return (
    <>
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Ingredient</DialogTitle>
          </DialogHeader>
          <IngredientForm
            initialData={{
              name: searchValue,
              unit: 'g',
              macros: { protein: 0, carbs: 0, fat: 0, calories: 0, fiber: 0 },
              purchaseUnit: { name: 'pack', amount: 100 },
              barcodes: []
            }}
            onSuccess={(newIngredient) => {
              if (newIngredient) {
                onChange({ ingredientId: newIngredient.id })
              }
              setShowCreateDialog(false)
              // resetSearch()
            }}
          />
        </DialogContent>
      </Dialog>

      {showScanner && (
        <BarcodeScanner
          onScanSuccess={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
      <div className={cn("flex gap-2 items-end", isGhost && "opacity-60 hover:opacity-100 transition-opacity")}>
        <div className="flex-1 space-y-1 min-w-0 flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="flex-1 justify-between font-normal px-3 h-auto py-2"
              >
                <div className="flex flex-col items-start truncate text-left">
                  {selectedIngredient ? (
                    <>
                      <span className="font-medium text-sm">{selectedIngredient.name}</span>
                      <MacroPreview macros={selectedIngredient.macros} />
                    </>
                  ) : (
                    <span className={cn("text-muted-foreground", isGhost ? "italic" : "")}>
                      {isGhost ? "+ Add ingredient..." : "Select ingredient..."}
                    </span>
                  )}
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[85vw] sm:w-[400px] p-0"
              align="start"
              side="bottom"
            >
              <Command shouldFilter={false} className="max-h-[300px] sm:max-h-[400px]">
                <CommandInput
                  placeholder="Search local or web..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                  className="h-12 text-base"
                />
                <CommandList>
                  <CommandGroup heading="My Ingredients">
                    {allIngredients
                      .filter(i => i.name.toLowerCase().includes(searchValue.toLowerCase()))
                      .map((ingredient) => (
                        <CommandItem
                          key={ingredient.id}
                          value={ingredient.id}
                          onSelect={() => {
                            onChange({ ingredientId: ingredient.id })
                            resetSearch()
                          }}
                          className="cursor-pointer py-3 aria-selected:bg-accent data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                        >
                          <Check
                            className={cn(
                              "mr-3 h-4 w-4 shrink-0",
                              ingredientId === ingredient.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{ingredient.name}</span>
                            <MacroPreview macros={ingredient.macros} />
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>

                  {searchValue && (
                    <CommandGroup>
                      <CommandItem
                        value={`create-custom-${searchValue}`}
                        onSelect={() => {
                          setOpen(false)
                          setShowCreateDialog(true)
                        }}
                        className="cursor-pointer py-3 font-semibold text-primary data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                      >
                        <PlusCircle className="mr-3 h-4 w-4" />
                        Create "{searchValue}"
                      </CommandItem>
                    </CommandGroup>
                  )}

                  {(debouncedSearch.length > 2 || offResults.length > 0 || isSearching) && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="Web Search (Open Food Facts)">
                        {isSearching && (
                          <div className="py-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                          </div>
                        )}

                        {offResults.map((product, i) => (
                          <CommandItem
                            key={`off-${i}`}
                            value={`off-${product.code || i}`}
                            onSelect={() => handleImport(product)}
                            className="cursor-pointer py-3 aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20 data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                          >
                            <Cloud className="mr-3 h-4 w-4 text-blue-500 shrink-0" />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-medium text-blue-700 dark:text-blue-400">
                                {product.product_name}
                              </span>
                              <MacroPreview macros={product.nutriments} />
                              <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <PlusCircle className="h-3 w-3" /> Tap to import
                              </span>
                            </div>
                          </CommandItem>
                        ))}

                        {!isSearching && offResults.length === 0 && debouncedSearch.length > 2 && (
                          <div className="py-4 text-center text-sm text-muted-foreground">
                            No web results found for &quot;{debouncedSearch}&quot;.
                          </div>
                        )}
                      </CommandGroup>
                    </>
                  )}

                  {allIngredients.length === 0 && !searchValue && (
                    <CommandEmpty className="py-6 text-muted-foreground">
                      Start typing to search...
                    </CommandEmpty>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setShowScanner(true)}
            title="Scan Barcode"
          >
            <Barcode className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-20 sm:w-24 space-y-1">
          <Input
            type="number"
            value={amount}
            onChange={(e) => onChange({ amount: Number(e.target.value) })}
            placeholder="Qty"
            className={cn("text-right h-auto py-2", isGhost && "opacity-50")}
          />
        </div>
        {!isGhost && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            tabIndex={-1}
            className="h-10 w-10 shrink-0"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </>
  )
}
