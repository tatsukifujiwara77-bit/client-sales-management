export interface AlertSetting {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface RawAlertSettingRow {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export function mapAlertSettingRow(row: RawAlertSettingRow): AlertSetting {
  return {
    key: row.key,
    value: row.value,
    description: row.description,
    updatedAt: row.updated_at,
  };
}
