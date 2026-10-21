import { EmptyState } from "@/components/EmptyState";
export const metadata = { title: "News" };
export default function NewsPage() {
  return (<><h1 className="pt-2 pb-3 text-h1">News</h1>
    <EmptyState title="Field news is on its way" body="Coast, water and hazard stories from science outlets arrive in build step 5." /></>);
}
