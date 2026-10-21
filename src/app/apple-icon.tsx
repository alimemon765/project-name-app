import { ImageResponse } from "next/og";
import { PlaceholderMark } from "@/components/PlaceholderMark";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export default function AppleIcon() { return new ImageResponse(<PlaceholderMark size={180} />, size); }
