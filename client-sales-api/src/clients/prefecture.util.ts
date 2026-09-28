/**
 * クライアントの所在地(address)から都道府県を自動判定するユーティリティ。
 * ベストエフォート: 判定できない場合はnullを返す(呼び出し元はprefectureをnullのまま保存する)。
 */

export const PREFECTURES = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
] as const;

/**
 * 県庁所在地・政令指定都市など、市区町村名だけでも都道府県を一意に絞れる主要市の対応表。
 * 網羅的ではない(「中央区」等、市名を伴わない区名だけでは全国的に重複するため意図的に含めない)。
 */
const MAJOR_CITY_TO_PREFECTURE: Record<string, string> = {
  札幌市: '北海道',
  青森市: '青森県',
  盛岡市: '岩手県',
  仙台市: '宮城県',
  秋田市: '秋田県',
  山形市: '山形県',
  福島市: '福島県',
  水戸市: '茨城県',
  宇都宮市: '栃木県',
  前橋市: '群馬県',
  さいたま市: '埼玉県',
  千葉市: '千葉県',
  横浜市: '神奈川県',
  川崎市: '神奈川県',
  相模原市: '神奈川県',
  新潟市: '新潟県',
  富山市: '富山県',
  金沢市: '石川県',
  福井市: '福井県',
  甲府市: '山梨県',
  長野市: '長野県',
  岐阜市: '岐阜県',
  静岡市: '静岡県',
  浜松市: '静岡県',
  名古屋市: '愛知県',
  津市: '三重県',
  大津市: '滋賀県',
  京都市: '京都府',
  大阪市: '大阪府',
  堺市: '大阪府',
  神戸市: '兵庫県',
  奈良市: '奈良県',
  和歌山市: '和歌山県',
  鳥取市: '鳥取県',
  松江市: '島根県',
  岡山市: '岡山県',
  広島市: '広島県',
  山口市: '山口県',
  徳島市: '徳島県',
  高松市: '香川県',
  松山市: '愛媛県',
  高知市: '高知県',
  北九州市: '福岡県',
  福岡市: '福岡県',
  佐賀市: '佐賀県',
  長崎市: '長崎県',
  熊本市: '熊本県',
  大分市: '大分県',
  宮崎市: '宮崎県',
  鹿児島市: '鹿児島県',
  那覇市: '沖縄県',
};

/** GSIの住所検索と同じ理由(先頭の郵便番号があると住所として扱えない)で、判定前に取り除く */
function stripLeadingPostalCode(address: string): string {
  return address.replace(/^[〒\s]*\d{3}-?\d{4}\s*/, '').trim();
}

function matchPrefecturePrefix(text: string): string | null {
  return PREFECTURES.find((pref) => text.startsWith(pref)) ?? null;
}

function matchMajorCityPrefix(text: string): string | null {
  const city = Object.keys(MAJOR_CITY_TO_PREFECTURE).find((c) => text.startsWith(c));
  return city ? MAJOR_CITY_TO_PREFECTURE[city] : null;
}

/**
 * @param address        クライアントの所在地入力(郵便番号付きの場合あり)
 * @param geocodedTitle  ジオコーディング(GSI)結果の完全一致住所文字列。通常「都道府県+市区町村+...」の形で返る
 */
export function extractPrefecture(address: string, geocodedTitle?: string | null): string | null {
  const trimmedAddress = stripLeadingPostalCode(address);

  return (
    matchPrefecturePrefix(trimmedAddress) ??
    (geocodedTitle ? matchPrefecturePrefix(geocodedTitle.trim()) : null) ??
    matchMajorCityPrefix(trimmedAddress) ??
    (geocodedTitle ? matchMajorCityPrefix(geocodedTitle.trim()) : null)
  );
}
