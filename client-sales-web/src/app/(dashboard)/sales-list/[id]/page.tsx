/**
 * 営業リスト(契約前の見込み客)の詳細。データ実体・表示内容ともに/clients/[id]と完全に同じ
 * (ClientDetailHeaderが client.salesStage.isClosed を見て「戻る」等の遷移先を自動判定するため、
 * ページ側で表示を出し分ける必要がない)。実装の重複を避けるため、そちらをそのまま再エクスポートする。
 */
export { default } from '../../clients/[id]/page';
