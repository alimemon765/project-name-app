import { ImageResponse } from "next/og";
import { PlaceholderMark } from "@/components/PlaceholderMark";

const SIZES = new Set([192, 512]);

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Unknown icon size", { status: 404 });
  const maskable = new URL(req.url).searchParams.get("maskable") === "1";
  return new ImageResponse(<PlaceholderMark size={size} maskable={maskable} />, { width: size, height: size });
}
