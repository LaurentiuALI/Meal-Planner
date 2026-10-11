import { exportAll } from "@/server/backup";
import { today } from "@/domain/plan";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await exportAll();
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="meal-planner-${today()}.json"`,
    },
  });
}
