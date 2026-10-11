"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MacroLine } from "@/components/macros";
import { IngredientPicker } from "@/components/ingredient-picker";
import { recipePerServing } from "@/domain/macros";
import { normalize } from "@/domain/text";
import { shortDate, SLOT_LABELS, weekdayName, type MealSlot } from "@/domain/plan";
import type { Ingredient, Recipe } from "@/domain/types";
import { addMealAction, recipeChoicesAction } from "@/server/plan-actions";

const CATEGORIES: Record<MealSlot, Recipe["category"][]> = {
  pranz: ["pranz", "rapid", "cina"],
  gustare: ["gustare"],
  cina: ["cina", "rapid", "pranz"],
  extra: ["gustare", "rapid", "pranz", "cina"],
};

type Choices = { recipes: Recipe[]; ingredients: Record<string, Ingredient> };
let cache: Choices | null = null;

export function AddMealDialog({ target, onClose }: { target: { date: string; slot: MealSlot } | null; onClose: () => void }) {
  const router = useRouter();
  const [choices, setChoices] = useState<Choices | null>(cache);
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [gramsValue, setGramsValue] = useState("100");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!target) return;
    setQuery("");
    setProduct(null);
    if (!cache) recipeChoicesAction().then((c) => setChoices((cache = c)));
  }, [target]);

  const list = useMemo(() => {
    if (!choices || !target) return [];
    const cats = CATEGORIES[target.slot];
    const q = normalize(query);
    return choices.recipes
      .filter((r) => cats.includes(r.category) && (!q || normalize(r.name).includes(q)))
      .sort((a, b) => cats.indexOf(a.category) - cats.indexOf(b.category) || a.name.localeCompare(b.name, "ro"));
  }, [choices, target, query]);

  const add = (input: Parameters<typeof addMealAction>[0], label: string) =>
    start(async () => {
      await addMealAction(input);
      toast.success(`${label} → ${SLOT_LABELS[input.slot as MealSlot].toLowerCase()}`);
      router.refresh();
      onClose();
    });

  return (
    <>
      <Dialog open={!!target && !picking} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="top-4 flex max-h-[88dvh] translate-y-0 flex-col gap-3 p-4 sm:top-[8%]">
          {target && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {SLOT_LABELS[target.slot]} · {weekdayName(target.date)} {shortDate(target.date)}
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue={target.slot === "extra" ? "produs" : "reteta"} className="min-h-0 flex-1">
                <TabsList className="w-full">
                  <TabsTrigger value="reteta">Rețetă</TabsTrigger>
                  <TabsTrigger value="produs">Produs</TabsTrigger>
                </TabsList>
                <TabsContent value="reteta" className="flex min-h-0 flex-col gap-2">
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută rețeta" className="pl-9" />
                  </div>
                  <ul className="-mx-1 max-h-[55dvh] overflow-y-auto">
                    {!choices && (
                      <li className="flex justify-center py-6">
                        <Loader2 className="animate-spin text-muted-foreground" />
                      </li>
                    )}
                    {list.map((r) => (
                      <li key={r.id}>
                        <button
                          disabled={pending}
                          onClick={() => add({ date: target.date, slot: target.slot, recipeId: r.id }, r.name)}
                          className="w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                        >
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            {r.name}
                            {r.freezes && <Snowflake className="size-3.5 text-fat" />}
                          </span>
                          <MacroLine m={recipePerServing(r, (id) => choices!.ingredients[id])} className="text-xs text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
                <TabsContent value="produs" className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={() => setPicking(true)}>
                    <Search /> {product ? product.name : "Alege produsul"}
                  </Button>
                  <label className="flex items-center gap-2 text-sm">
                    Cantitate
                    <Input className="w-24" inputMode="numeric" value={gramsValue} onChange={(e) => setGramsValue(e.target.value)} />g
                  </label>
                  <Button
                    className="w-full"
                    disabled={!product || pending || !(Number(gramsValue) > 0)}
                    onClick={() => product && add({ date: target.date, slot: target.slot, ingredientId: product.id, grams: Number(gramsValue) }, product.name)}
                  >
                    {pending && <Loader2 className="animate-spin" />} Adaugă
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
      <IngredientPicker
        open={picking}
        onOpenChange={setPicking}
        onPick={(h) => {
          setProduct({ id: h.id, name: h.name });
          setPicking(false);
        }}
      />
    </>
  );
}
