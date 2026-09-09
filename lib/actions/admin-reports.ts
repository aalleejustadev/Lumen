"use server"

import { getPayoutRun, type PayoutRunDetail } from "@/lib/admin/reports"
import { getSession } from "@/lib/auth"

/**
 * Loads one payout run's recipients for the dialog in
 * `payout-run__dialog_admin.png`.
 *
 * On demand rather than shipped with the table: the list draws none of this,
 * and a page of runs would otherwise carry every recipient of every run to a
 * dialog most visits never open.
 *
 * **The role is re-checked here.** A Server Action is a public endpoint — the
 * console's layout guard covers the page, not this function — so it repeats
 * the check rather than trusting that only the console can reach it. It
 * returns `{ ok, ... }` for the caller to render instead of throwing, the
 * shape `lib/actions/cart.ts` established.
 */
export async function loadPayoutRun(
  id: string
): Promise<
  { ok: true; run: PayoutRunDetail } | { ok: false; message: string }
> {
  const session = await getSession()
  if (session?.user.role !== "admin") {
    return { ok: false, message: "You do not have access to payout runs." }
  }

  const run = await getPayoutRun(id)
  if (!run) return { ok: false, message: "That payout run no longer exists." }

  return { ok: true, run }
}
