import "server-only";
import { connect } from "./connect";

// Un singur client per proces, inclusiv peste hot-reload în dev.
const g = globalThis as unknown as { __db?: ReturnType<typeof connect> };

export const db = g.__db ?? (g.__db = connect());
export type Db = typeof db;
