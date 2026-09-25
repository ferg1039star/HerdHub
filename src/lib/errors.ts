// Supabase returns PostgrestError objects that are plain objects, not JS Error
// instances, so `err instanceof Error` misses them. These helpers normalize
// error messages and detect Postgres unique-constraint violations (code 23505).

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "Something went wrong";
}

export function isUniqueViolation(err: unknown): boolean {
  if (err && typeof err === "object") {
    const code = (err as { code?: unknown }).code;
    if (code === "23505") return true;
  }
  const msg = errorMessage(err).toLowerCase();
  return msg.includes("duplicate") || msg.includes("unique");
}
