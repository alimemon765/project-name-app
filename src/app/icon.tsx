import { ImageResponse } from "next/og";
import { PlaceholderMark } from "@/components/PlaceholderMark";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export default function Icon() { return new ImageResponse(<PlaceholderMark size={32} />, size); }
