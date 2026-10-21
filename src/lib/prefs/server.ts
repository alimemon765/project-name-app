// Reader preferences on the server (inside a Suspense boundary: cookies() is request data).
import { cookies } from "next/headers";
import { PREFS_COOKIE, decodePrefs, type Prefs } from "./prefs";

export async function readPrefs(): Promise<Prefs> {
  return decodePrefs((await cookies()).get(PREFS_COOKIE)?.value);
}
