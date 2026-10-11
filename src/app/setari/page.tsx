import Link from "next/link";
import { ChevronRight, CookingPot } from "lucide-react";
import { PageHeader } from "@/components/macros";
import { getSettings } from "@/server/settings";
import { SettingsForm } from "./settings-form";
import { BackupSection } from "./backup-section";

export const metadata = { title: "Setări" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Setări" />
      <div className="space-y-6">
        <SettingsForm initial={settings} />
        <Link href="/setari/bucatarie" className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
          <span className="flex items-center gap-3">
            <CookingPot className="size-5 text-primary" />
            <span>
              <span className="block font-medium">Bucătăria mea</span>
              <span className="block text-xs text-muted-foreground">Ustensile, capacități și acțiuni predefinite</span>
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <BackupSection />
      </div>
    </>
  );
}
