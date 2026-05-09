// Tenant derivation. We don't have an Org table yet, so the tenant is the lowercased
// email domain. Single-user logins (no email) fall back to a per-user tenant so they
// can never collide with anyone else's data.

const DEFAULT_TENANT = "default";

export function tenantOf(email: string | undefined | null, userId: string): string {
  if (!email) return `user:${userId}`;
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return `user:${userId}`;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain.length > 0 ? domain : DEFAULT_TENANT;
}
