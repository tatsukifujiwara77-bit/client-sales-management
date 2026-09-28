/**
 * 業種マスタ。sales_stagesとは異なり固定7概念のような制約が無いため、
 * 名称変更・並び順の調整に加えて新規作成・削除もadminに許可する。
 */
export interface Industry {
  id: string;
  name: string;
  sortOrder: number;
  /** このタブでの表示専用（使用中の業種は削除できないようにするための参考件数） */
  clientCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RawIndustryRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function mapIndustryRow(row: RawIndustryRow, clientCount: number): Industry {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    clientCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
