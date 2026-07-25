/**
 * Payment methods — single source of truth.
 * ------------------------------------------
 * The chains a member can be paid on. Defined in exactly one place so the
 * entry form's selector, the admin review list, the CSV export, and the zod
 * schema all agree on both the stored value AND the exact wording shown to
 * people. Adding a chain later means editing only this array — every consumer
 * picks it up automatically.
 *
 * `value` is what's stored in the database (a stable slug, matching how
 * `status` and `campaign_type` are stored — enum-like text, not display
 * strings). `label` is the exact human wording — "USDT (BEP20)" / "USDC
 * (Base)" — shown in the form and written into the CSV, so whoever runs the
 * payout reads the chain plainly rather than decoding a slug.
 */

export const PAYMENT_METHODS = [
  { value: "usdt_bep20", label: "USDT (BEP20)" },
  { value: "usdc_base", label: "USDC (Base)" },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

// A non-empty tuple of the valid values, in the exact shape z.enum() wants.
export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS.map((m) => m.value) as [
  PaymentMethodValue,
  ...PaymentMethodValue[],
];

const PAYMENT_METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label]),
) as Record<PaymentMethodValue, string>;

/**
 * Maps a stored value to its display label. Falls back to the raw value for
 * anything unrecognised (e.g. a legacy row from before this field existed, or
 * a value added directly in SQL) rather than rendering "undefined" — the raw
 * slug is still readable, an empty cell isn't.
 */
export function paymentMethodLabel(value: string | null | undefined): string {
  if (!value) return "";
  return PAYMENT_METHOD_LABELS[value as PaymentMethodValue] ?? value;
}
