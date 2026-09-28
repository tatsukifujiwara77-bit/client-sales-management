/**
 * 所在地とビル名を画面表示用に連結する。
 * 地図のジオコーディングには所在地(address)のみを使うため、ビル名は表示専用の付加情報として扱う。
 */
export function formatFullAddress(address: string | null, buildingName: string | null): string | null {
  const parts = [address, buildingName].map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' ') : null;
}
