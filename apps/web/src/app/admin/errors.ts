/** Turns database errors into messages a person can act on; RLS rejections become a permission message. */
export function friendlyError(e: unknown): string {
  const message =
    e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  if (/row-level security|permission denied|not allowed to manage|Cannot coerce|0 rows/i.test(message)) {
    return "You don't have permission to do that.";
  }
  const missingUser = /no user with email (.+)/i.exec(message);
  if (missingUser) return `No account uses the email ${missingUser[1]}. They need to sign in once first.`;
  return message || "Something went wrong";
}
