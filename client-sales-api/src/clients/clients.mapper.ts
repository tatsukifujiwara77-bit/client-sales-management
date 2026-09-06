import type {
  ClientAssignmentItem,
  ClientDetail,
  ClientListItem,
  RawAssignmentEmbed,
  RawClientDetailRow,
  RawClientListRow,
} from './types/client.types.js';

function mapAssignments(raw: RawAssignmentEmbed[] | null): ClientAssignmentItem[] {
  if (!raw) return [];
  return raw
    .filter((a): a is RawAssignmentEmbed & { profile: NonNullable<RawAssignmentEmbed['profile']> } =>
      Boolean(a.profile),
    )
    .map((a) => ({
      userId: a.user_id,
      fullName: a.profile.full_name,
      isPrimary: a.is_primary,
    }));
}

function findPrimaryAssignee(assignments: ClientAssignmentItem[]): ClientAssignmentItem | null {
  return assignments.find((a) => a.isPrimary) ?? assignments[0] ?? null;
}

export function mapClientListRow(row: RawClientListRow): ClientListItem {
  const assignments = mapAssignments(row.assignments);
  const primary = findPrimaryAssignee(assignments);

  return {
    id: row.id,
    companyName: row.company_name,
    office: row.office ? { id: row.office.id, name: row.office.name } : null,
    salesStage: {
      id: row.sales_stage.id,
      name: row.sales_stage.name,
      isClosed: row.sales_stage.is_closed,
    },
    temperature: row.temperature,
    address: row.address,
    lastVisitedAt: row.last_visited_at,
    lastActivityAt: row.last_activity_at,
    primaryAssignee: primary ? { id: primary.userId, fullName: primary.fullName } : null,
    nextAction: null,
    updatedAt: row.updated_at,
  };
}

export function mapClientDetailRow(row: RawClientDetailRow): ClientDetail {
  const listItem = mapClientListRow(row);
  const assignments = mapAssignments(row.assignments);

  return {
    ...listItem,
    lat: row.lat,
    lng: row.lng,
    characteristics: row.characteristics,
    cautionNotes: row.caution_notes,
    discoveredBy: row.discovered_by_profile
      ? { id: row.discovered_by_profile.id, fullName: row.discovered_by_profile.full_name }
      : null,
    lossReason: row.loss_reason ? { id: row.loss_reason.id, name: row.loss_reason.name } : null,
    assignments,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}
