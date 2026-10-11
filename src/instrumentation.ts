/** La pornirea serverului aplicăm migrările, ca un deploy nou să nu ceară pași manuali. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ migrate }, { connect }] = await Promise.all([import("drizzle-orm/libsql/migrator"), import("./server/db/connect")]);
  await migrate(connect(), { migrationsFolder: "drizzle" });
}
