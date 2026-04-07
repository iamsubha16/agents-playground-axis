/**
 * Read env at runtime without static `process.env.NAME` access.
 * Next.js webpack inlines those literals into server bundles, which triggers
 * Netlify secrets scanning on build output even for server-only vars.
 */
export function getRuntimeEnv(name: string): string {
  const v = Reflect.get(process.env, name);
  return typeof v === "string" ? v : "";
}
