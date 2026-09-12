/**
 * ============================================================================
 *  APPLICATION IDENTITY
 * ============================================================================
 *
 *  Several Opright applications share one Paystack (and Flutterwave/Stripe)
 *  account, so every webhook this service receives may belong to a sibling app.
 *  Each outbound transaction is therefore stamped with an application id, and
 *  inbound webhooks are filtered on it.
 *
 *  Configure per deployment:
 *
 *    APPLICATION_ID=opright_hospital        # this service
 *    APPLICATION_ID=opright_health          # the sibling consumer app
 *
 *  APPLICATION_ID_ALIASES lets a deployment keep accepting ids it used to
 *  stamp, so a rename does not strand in-flight payments:
 *
 *    APPLICATION_ID=opright_hospital
 *    APPLICATION_ID_ALIASES=com.coresystemglobal.hms
 *
 *  The canonical id is what gets stamped on NEW transactions; aliases are only
 *  ever accepted on INBOUND webhooks.
 */

/** Canonical id stamped on every outbound transaction. */
export function applicationId(): string {
  const id = process.env.APPLICATION_ID;

  if (!id) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: APPLICATION_ID must be set. Payment webhooks are shared across ' +
          'Opright applications and cannot be routed without it.'
      );
    }
    return 'opright_hospital';
  }
  return id;
}

/** Every id this deployment will accept on an inbound webhook. */
export function acceptedApplicationIds(): string[] {
  const aliases = (process.env.APPLICATION_ID_ALIASES || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  return [applicationId(), ...aliases];
}

export type WebhookOwnership = 'ours' | 'other' | 'unknown';

/**
 * Decide whether a webhook event belongs to this application.
 *
 *   'ours'    - stamped with our id (or a configured alias): process it.
 *   'other'   - stamped with a sibling app's id: ignore it, and do NOT record
 *               an idempotency entry for it.
 *   'unknown' - carries no id at all (a legacy transaction, or a sibling app
 *               that does not stamp). The caller resolves this by checking
 *               whether the payment reference exists locally.
 */
export function classifyWebhookOwnership(rawId: unknown): WebhookOwnership {
  if (rawId === null || rawId === undefined || rawId === '') return 'unknown';
  const id = String(rawId).trim();
  return acceptedApplicationIds().includes(id) ? 'ours' : 'other';
}
