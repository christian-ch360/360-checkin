import "server-only";

/**
 * The canonical agencyId for any agency-connected actor: their own row's id
 * if they ARE the agency (agencyId null — the "AgencyTeam" self-relation's
 * root), or their agencyId if they're a team member. Same helper as
 * agency-actions.ts's private effectiveAgencyIdFor, exported here so every
 * new Agency CRM action file (campaigns/contracts/invoices/files/tasks/
 * brand invitations) shares one definition instead of five copies.
 */
export function effectiveAgencyIdFor(actor: { id: string; agencyId: string | null }): string {
  return actor.agencyId ?? actor.id;
}
