import { EmptyState } from "@/components/EmptyState";
export const metadata = { title: "Feed" };
export default function FeedPage() {
  return (<><h1 className="pt-2 pb-3 text-h1">Feed</h1>
    <EmptyState title="Your feed starts with what you follow" body="Follow topics, journals and authors to see their new papers here. Following arrives with sign-in (build step 7)." /></>);
}
