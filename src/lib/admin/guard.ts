// Local-only admin tools (the classifier review page). Two locks: the ADMIN_LABELS=1 opt-in, and a localhost Host.
// The admin server also binds to 127.0.0.1 only (see package.json "admin"), because a Host header alone can be forged
// by another device on the same network.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** `env` defaults to process.env. A hosted deployment never qualifies, even if the flag leaks into its config. */
export function isLocalAdmin(host: string | null | undefined, flag: string | undefined, env: Record<string, string | undefined> = process.env): boolean {
  if (flag !== "1" || !host) return false;
  if (env.VERCEL || env.VERCEL_ENV) return false;
  const name = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  return LOCAL_HOSTS.has(name);
}
