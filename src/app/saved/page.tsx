import { Suspense } from "react";
import { SavedList } from "@/components/feed/SavedList";
export const metadata = { title: "Saved" };
export default function SavedPage() {
  return (<><h1 className="pt-2 pb-3 text-h1">Saved</h1><Suspense fallback={null}><SavedList /></Suspense></>);
}
