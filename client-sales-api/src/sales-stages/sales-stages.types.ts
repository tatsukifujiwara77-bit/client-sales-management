/**
 * 営業フェーズマスタ（設計書 5章）。
 * 「案件の進捗」ではなく「クライアントとの営業関係の進捗」を表す固定的な概念のため、
 * フェーズの新規作成・削除は提供しない（名称変更・並び順の調整のみ admin に許可する）。
 * 既存の7フェーズ構成や is_closed（営業終了判定）を前提にしている箇所
 * （アラートの3ヶ月訪問なし判定、ダッシュボードのパイプライン集計等）を壊さないため。
 */
export interface SalesStage {
  id: string;
  name: string;
  sortOrder: number;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RawSalesStageRow {
  id: string;
  name: string;
  sort_order: number;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export function mapSalesStageRow(row: RawSalesStageRow): SalesStage {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isClosed: row.is_closed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
