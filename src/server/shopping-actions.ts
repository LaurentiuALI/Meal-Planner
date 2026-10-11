"use server";

import { z } from "zod";
import { applyChecks } from "./shopping";

const change = z.object({ ingredientId: z.string(), checked: z.boolean(), at: z.number().int() });

export async function syncChecksAction(listKey: string, changes: { ingredientId: string; checked: boolean; at: number }[]) {
  return applyChecks(z.string().regex(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/).parse(listKey), z.array(change).parse(changes));
}
