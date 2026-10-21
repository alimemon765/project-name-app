import { ThemeChoice } from "@/components/settings/ThemeChoice";
import { FeedSettings } from "@/components/settings/FeedSettings";
export const metadata = { title: "Settings" };
export default function SettingsPage() {
  return (
    <>
      <h1 className="pt-2 pb-3 text-h1">Settings</h1>
      <div className="flex max-w-[560px] flex-col gap-3"><FeedSettings /><ThemeChoice /></div>
    </>
  );
}
