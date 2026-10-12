"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ClipboardPaste, Loader2, MoveVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MacroLine } from "@/components/macros";
import { IngredientPicker } from "@/components/ingredient-picker";
import { ingredientsAction, parseRecipeTextAction, saveRecipeAction, type ParsedMatch } from "@/server/actions";
import { lineGrams, recipePerServing } from "@/domain/macros";
import { unitsFor, UnitError } from "@/domain/units";
import { RECIPE_CATEGORIES, type Action, type Ingredient, type Recipe, type RecipeLine, type RecipeStep } from "@/domain/types";
import { grams } from "@/lib/format";
import { emptyStep, shortId } from "@/domain/recipe";

const uid = shortId;

const numberOr = (v: string, fallback: number | null) => {
  const n = Number(v.replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) ? fallback : n;
};

export function RecipeEditor({
  initial,
  initialIngredients,
  actions,
}: {
  initial: Recipe;
  initialIngredients: Record<string, Ingredient>;
  actions: Action[];
}) {
  const router = useRouter();
  const [recipe, setRecipe] = useState(initial);
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [picker, setPicker] = useState<{ stepId: string } | null>(null);
  const [pasteFor, setPasteFor] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const lookup = (id: string) => ingredients[id];
  const macros = useMemo(() => {
    try {
      return recipePerServing(recipe, (id) => ingredients[id]);
    } catch {
      return null;
    }
  }, [recipe, ingredients]);

  const patch = (p: Partial<Recipe>) => setRecipe((r) => ({ ...r, ...p }));
  const patchStep = (id: string, p: Partial<RecipeStep>) =>
    setRecipe((r) => ({ ...r, steps: r.steps.map((s) => (s.id === id ? { ...s, ...p } : s)) }));
  const patchLine = (stepId: string, lineId: string, p: Partial<RecipeLine>) =>
    setRecipe((r) => ({
      ...r,
      steps: r.steps.map((s) => (s.id === stepId ? { ...s, lines: s.lines.map((l) => (l.id === lineId ? { ...l, ...p } : l)) } : s)),
    }));
  const moveStep = (i: number, d: -1 | 1) =>
    setRecipe((r) => {
      const steps = [...r.steps];
      const j = i + d;
      if (j < 0 || j >= steps.length) return r;
      [steps[i], steps[j]] = [steps[j], steps[i]];
      return { ...r, steps };
    });

  async function addLines(stepId: string, lines: Omit<RecipeLine, "id">[]) {
    const missing = lines.map((l) => l.ingredientId).filter((id) => !ingredients[id]);
    if (missing.length) {
      const fetched = await ingredientsAction(missing);
      setIngredients((m) => ({ ...m, ...fetched }));
    }
    setRecipe((r) => ({
      ...r,
      steps: r.steps.map((s) => (s.id === stepId ? { ...s, lines: [...s.lines, ...lines.map((l) => ({ ...l, id: uid() }))] } : s)),
    }));
  }

  function save() {
    startSave(async () => {
      const res = await saveRecipeAction({ ...recipe, steps: recipe.steps.filter((s) => s.lines.length || s.text.trim() || s.actionId) });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Rețeta a fost salvată");
      router.push(`/retete/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nume</Label>
          <Input id="name" value={recipe.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Bowl de pui cu orez" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="category">Categorie</Label>
            <select
              id="category"
              value={recipe.category}
              onChange={(e) => patch({ category: e.target.value as Recipe["category"] })}
              className="h-9 w-full rounded-md border bg-transparent px-2 text-base md:text-sm"
            >
              {RECIPE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="servings">Porții</Label>
            <Input id="servings" inputMode="numeric" value={recipe.servings} onChange={(e) => patch({ servings: numberOr(e.target.value, 1) ?? 1 })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="keeps">Se păstrează (zile)</Label>
            <Input id="keeps" inputMode="numeric" value={recipe.keepsDays} onChange={(e) => patch({ keepsDays: numberOr(e.target.value, 3) ?? 3 })} />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Switch checked={recipe.freezes} onCheckedChange={(v) => patch({ freezes: v })} /> Se congelează
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Note</Label>
          <Textarea id="notes" rows={2} value={recipe.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Ce merge separat, cum se încălzește…" />
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-4 border-y bg-background/95 px-4 py-2 backdrop-blur">
        <div className="text-xs text-muted-foreground">Per porție</div>
        {macros ? <MacroLine m={macros} /> : <span className="text-sm text-destructive">Verifică unitățile</span>}
      </div>

      <ol className="space-y-3">
        {recipe.steps.map((step, i) => (
          <li key={step.id} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
              <select
                aria-label="Acțiune"
                value={step.actionId ?? ""}
                onChange={(e) => patchStep(step.id, { actionId: e.target.value || null })}
                className="h-9 min-w-0 flex-1 rounded-md border bg-transparent px-2 text-base md:text-sm"
              >
                <option value="">— fără acțiune —</option>
                {actions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.minutes ? ` · ${a.minutes} min` : ""}
                    {a.tempC ? ` · ${a.tempC}°C` : ""}
                  </option>
                ))}
              </select>
              <Button type="button" size="icon" variant="ghost" onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Mută în sus">
                <ArrowUp />
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => moveStep(i, 1)} disabled={i === recipe.steps.length - 1} aria-label="Mută în jos">
                <ArrowDown />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => patch({ steps: recipe.steps.filter((s) => s.id !== step.id) })}
                aria-label="Șterge pasul"
              >
                <Trash2 />
              </Button>
            </div>
            <Textarea rows={2} value={step.text} onChange={(e) => patchStep(step.id, { text: e.target.value })} placeholder="Ce faci la pasul ăsta" />
            {step.actionId && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Minute (gol = implicit):</span>
                <Input
                  className="h-8 w-20"
                  inputMode="numeric"
                  value={step.minutes ?? ""}
                  placeholder={String(actions.find((a) => a.id === step.actionId)?.minutes ?? "")}
                  onChange={(e) => patchStep(step.id, { minutes: numberOr(e.target.value, null) })}
                />
              </div>
            )}

            <ul className="space-y-2">
              {step.lines.map((line) => (
                <LineRow
                  key={line.id}
                  line={line}
                  ingredient={lookup(line.ingredientId)}
                  onChange={(p) => patchLine(step.id, line.id, p)}
                  onRemove={() => patchStep(step.id, { lines: step.lines.filter((l) => l.id !== line.id) })}
                />
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setPicker({ stepId: step.id })}>
                <Plus /> Ingredient
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPasteFor(step.id)}>
                <ClipboardPaste /> Lipește listă
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <Button type="button" variant="outline" className="w-full" onClick={() => patch({ steps: [...recipe.steps, emptyStep()] })}>
        <Plus /> Pas nou
      </Button>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 flex gap-2 bg-background/95 px-4 py-2 backdrop-blur md:bottom-4 md:mx-0 md:px-0">
        <Button className="flex-1" size="lg" onClick={save} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} Salvează rețeta
        </Button>
        <Button size="lg" variant="outline" onClick={() => router.back()}>
          Renunță
        </Button>
      </div>

      <IngredientPicker
        open={!!picker}
        onOpenChange={(o) => !o && setPicker(null)}
        onPick={(hit) => picker && addLines(picker.stepId, [{ ingredientId: hit.id, amount: 100, unit: "g", flex: null }])}
      />
      <PasteDialog
        open={!!pasteFor}
        onOpenChange={(o) => !o && setPasteFor(null)}
        onConfirm={(lines) => pasteFor && addLines(pasteFor, lines)}
      />
    </div>
  );
}

function LineRow({
  line,
  ingredient,
  onChange,
  onRemove,
}: {
  line: RecipeLine;
  ingredient?: Ingredient;
  onChange: (p: Partial<RecipeLine>) => void;
  onRemove: () => void;
}) {
  const units = ingredient ? unitsFor(ingredient) : ["g"];
  let g: number | null = null;
  let unitError = false;
  try {
    g = ingredient ? lineGrams(line, () => ingredient) : null;
  } catch (e) {
    unitError = e instanceof UnitError;
  }
  return (
    <li className="rounded-md bg-muted/50 p-2">
      <div className="mb-1.5 text-sm leading-snug">
        {ingredient?.name ?? "…"}
        {ingredient?.brand && <span className="text-muted-foreground"> · {ingredient.brand}</span>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          aria-label="Cantitate"
          className="h-8 w-20 bg-background text-right"
          inputMode="decimal"
          defaultValue={String(line.amount).replace(".", ",")}
          onChange={(e) => onChange({ amount: numberOr(e.target.value, 0) ?? 0 })}
        />
        <select
          aria-label="Unitate"
          value={line.unit}
          onChange={(e) => onChange({ unit: e.target.value })}
          className="h-8 min-w-0 flex-1 rounded-md border bg-background px-1 text-base md:text-sm"
        >
          {[...new Set([line.unit, ...units])].map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <Button
          type="button"
          size="icon"
          variant={line.flex ? "default" : "ghost"}
          className="size-8"
          title="Cantitate flexibilă (solverul o ajustează)"
          aria-pressed={!!line.flex}
          onClick={() => {
            const base = g ?? 100;
            onChange({ flex: line.flex ? null : { min: Math.round(base * 0.6), max: Math.round(base * 1.5) } });
          }}
        >
          <MoveVertical />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="size-8" onClick={onRemove} aria-label="Șterge">
          <Trash2 />
        </Button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {unitError ? <span className="text-destructive">Unitatea nu e definită pentru produs</span> : g != null && line.unit !== "g" && <span>= {grams(g)}</span>}
        {line.flex && (
          <span className="flex items-center gap-1">
            interval
            <Input
              className="h-7 w-16 bg-background"
              inputMode="numeric"
              defaultValue={line.flex.min}
              onChange={(e) => onChange({ flex: { min: numberOr(e.target.value, 0) ?? 0, max: line.flex!.max } })}
            />
            –
            <Input
              className="h-7 w-16 bg-background"
              inputMode="numeric"
              defaultValue={line.flex.max}
              onChange={(e) => onChange({ flex: { min: line.flex!.min, max: numberOr(e.target.value, 0) ?? 0 } })}
            />
            g
          </span>
        )}
      </div>
    </li>
  );
}

/** Lipește o listă de ingrediente (o linie pe ingredient) și confirmă potrivirile nesigure. */
function PasteDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (lines: Omit<RecipeLine, "id">[]) => void;
}) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<(ParsedMatch & { choice: string | null })[] | null>(null);
  const [pending, start] = useTransition();
  const [pickFor, setPickFor] = useState<number | null>(null);

  // Golim la deschidere, nu la închidere, ca dialogul să nu-și schimbe conținutul în animația de ieșire.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setText("");
      setParsed(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lipește ingredientele</DialogTitle>
          </DialogHeader>
          {!parsed ? (
            <>
              <Textarea
                rows={7}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"300g piept pui\n2 buc ou\n1 lingură ulei de măsline\n150 orez basmati"}
              />
              <DialogFooter>
                <Button
                  disabled={!text.trim() || pending}
                  onClick={() =>
                    start(async () => {
                      const res = await parseRecipeTextAction(text);
                      setParsed(res.map((r) => ({ ...r, choice: r.confident || r.options.length === 1 ? r.options[0]?.id ?? null : null })));
                    })
                  }
                >
                  {pending && <Loader2 className="animate-spin" />} Interpretează
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <ul className="space-y-2">
                {parsed.map((p, i) => (
                  <li key={i} className={`rounded-md border p-2 text-sm ${p.choice ? "" : "border-amber-500"}`}>
                    <div className="text-xs text-muted-foreground">
                      „{p.raw.trim()}” → {p.amount ?? "?"} {p.unit ?? ""}
                    </div>
                    <select
                      className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-base md:text-sm"
                      value={p.choice ?? ""}
                      onChange={(e) => {
                        if (e.target.value === "__search") return setPickFor(i);
                        setParsed(parsed.map((x, j) => (j === i ? { ...x, choice: e.target.value || null } : x)));
                      }}
                    >
                      <option value="">— alege —</option>
                      {p.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                          {o.brand ? ` · ${o.brand}` : ""}
                          {o.inLibrary ? " ★" : ""}
                        </option>
                      ))}
                      <option value="__search">Caută altceva…</option>
                    </select>
                  </li>
                ))}
              </ul>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setParsed(null)}>
                  Înapoi
                </Button>
                <Button
                  disabled={parsed.some((p) => !p.choice)}
                  onClick={() => {
                    onConfirm(
                      parsed.map((p) => ({
                        ingredientId: p.choice!,
                        amount: p.amount ?? 0,
                        unit: p.unit ?? "g",
                        flex: null,
                      })),
                    );
                    onOpenChange(false);
                  }}
                >
                  Adaugă {parsed.length} ingrediente
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <IngredientPicker
        open={pickFor != null}
        initialQuery={pickFor != null && parsed ? parsed[pickFor].query : ""}
        onOpenChange={(o) => !o && setPickFor(null)}
        onPick={(hit) =>
          parsed &&
          setParsed(
            parsed.map((x, j) =>
              j === pickFor ? { ...x, choice: hit.id, options: [{ id: hit.id, name: hit.name, brand: hit.brand, inLibrary: hit.inLibrary }, ...x.options] } : x,
            ),
          )
        }
      />
    </>
  );
}
