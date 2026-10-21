import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
export const metadata = { title: "Offline" };
export default function OfflinePage() {
  return (<><h1 className="pt-2 pb-3 text-h1">You&apos;re offline</h1>
    <EmptyState title="This page needs a connection" body="Your saved papers are still here on this device.">
      <Link href="/saved" className="inline-flex min-h-11 items-center text-body underline underline-offset-4">Open saved papers</Link>
    </EmptyState></>);
}
