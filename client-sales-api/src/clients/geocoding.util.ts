import { Logger } from '@nestjs/common';

const logger = new Logger('GeocodingUtil');

export interface GeocodedCoordinates {
  lat: number;
  lng: number;
}

interface GsiAddressSearchResult {
  geometry?: { coordinates?: unknown };
}

/**
 * 国土地理院(GSI)の住所検索APIを使って、日本語住所から緯度経度を取得する。
 * https://msearch.gsi.go.jp/address-search/AddressSearch?q=<住所>
 *
 * このAPIを採用している理由: APIキー・アカウント登録が不要で無料。日本の住所に
 * 特化しており(政府公式サービス)、Google Maps Geocoding API等の有料サービスを
 * 契約せずに導入できる。
 *
 * ベストエフォート: ネットワークエラー・該当なしの場合はnullを返す。
 * 呼び出し元(ClientsService)はこれを許容し、lat/lngをnullのまま保存する
 * (地図にピンが出ないだけで、クライアントの登録・更新自体は失敗させない)。
 */
export async function geocodeAddress(address: string): Promise<GeocodedCoordinates | null> {
  const trimmed = address.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      logger.warn(`Geocoding request failed with status ${response.status} for address: ${trimmed}`);
      return null;
    }

    const results = (await response.json()) as GsiAddressSearchResult[];
    const coordinates = results[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return null;
    }

    // GSIはGeoJSON準拠で [経度, 緯度] の順で返す
    const [lng, lat] = coordinates as [unknown, unknown];
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  } catch (err) {
    logger.warn(`Geocoding failed for address "${trimmed}": ${(err as Error).message}`);
    return null;
  }
}
