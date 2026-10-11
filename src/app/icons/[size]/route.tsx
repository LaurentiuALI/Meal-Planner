import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/app-icon";

export const dynamic = "force-static";
export const generateStaticParams = () => [{ size: "192" }, { size: "512" }];

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = (await params).size === "512" ? 512 : 192;
  return new ImageResponse(<AppIcon size={size} />, { width: size, height: size });
}
