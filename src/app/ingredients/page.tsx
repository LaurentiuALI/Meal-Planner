"use client"

import { useState, useMemo } from "react"
import { useIngredientStore } from "@/store/useIngredientStore"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { IngredientForm } from "@/components/ingredients/ingredient-form"
import { OFFSearchDialog } from "@/components/ingredients/off-search-dialog"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Ingredient } from "@/types"
import { Plus, Trash2, Edit2 } from "lucide-react"

const columnHelper = createColumnHelper<Ingredient>()

export default function IngredientsPage() {
  const { ingredients, deleteIngredient } = useIngredientStore()
  const [isAdding, setIsAdding] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  
  // New state for imported data (which doesn't have an ID yet)
  const [importedData, setImportedData] = useState<Omit<Ingredient, 'id'> | null>(null)

  const handleImport = (data: Omit<Ingredient, "id">) => {
    setImportedData(data)
    setIsAdding(true)
  }

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("macros.calories", {
      header: "Cals (100u)",
    }),
    columnHelper.accessor("macros.protein", {
      header: "P",
    }),
    columnHelper.accessor("macros.carbs", {
      header: "C",
    }),
    columnHelper.accessor("macros.fat", {
      header: "F",
    }),
    columnHelper.accessor("unit", {
      header: "Unit",
    }),
    columnHelper.display({
      id: "actions",
      cell: (props) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditingIngredient(props.row.original)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteIngredient(props.row.original.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    }),
  ], [deleteIngredient])

  const table = useReactTable({
    data: ingredients,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ingredients</h1>
          <p className="text-muted-foreground">
            Manage your custom ingredients and their nutritional data.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <OFFSearchDialog onSelect={handleImport} />
          <Button onClick={() => {
            setImportedData(null)
            setIsAdding(true)
          }}>
            <Plus className="mr-2 h-4 w-4" /> Add Ingredient
          </Button>
        </div>
      </div>

      {(isAdding || editingIngredient) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {editingIngredient ? "Edit Ingredient" : "Add New Ingredient"}
            </CardTitle>
            <CardDescription>
              Macros are typically defined per 100g or 100ml.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IngredientForm
              // We cast importedData to any because the form handles the 'id' missing for new items logic internally
              initialData={editingIngredient || importedData || undefined}
              onSuccess={() => {
                setIsAdding(false)
                setEditingIngredient(null)
                setImportedData(null)
              }}
            />
            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => {
                setIsAdding(false)
                setEditingIngredient(null)
                setImportedData(null)
              }}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="h-24 text-center">
                      No ingredients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
