import { ThemeChoice } from "@/components/settings/ThemeChoice";
export const metadata = { title: "Settings" };
export default function SettingsPage() {
  return (<><h1 className="pt-2 pb-3 text-h1">Settings</h1><div className="max-w-[560px]"><ThemeChoice /></div></>);
}
