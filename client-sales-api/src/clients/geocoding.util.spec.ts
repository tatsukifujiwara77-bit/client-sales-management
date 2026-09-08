import { geocodeAddress } from './geocoding.util.js';

describe('geocodeAddress', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns lat/lng parsed from the GSI response (coordinates are [lng, lat])', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { geometry: { coordinates: [130.4017, 33.5902] }, properties: { title: '福岡県福岡市' } },
      ],
    }) as unknown as typeof fetch;

    const result = await geocodeAddress('福岡県福岡市中央区天神2丁目8-35');
    expect(result).toEqual({ lat: 33.5902, lng: 130.4017 });
  });

  it('returns null when the address is empty/whitespace-only (does not call fetch)', async () => {
    global.fetch = vi.fn();
    await expect(geocodeAddress('   ')).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns null when the API returns no results', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    await expect(geocodeAddress('存在しない住所')).resolves.toBeNull();
  });

  it('returns null when the API responds with a non-ok status (does not throw)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    await expect(geocodeAddress('東京都千代田区')).resolves.toBeNull();
  });

  it('returns null when fetch itself throws (network error, does not throw)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(geocodeAddress('東京都千代田区')).resolves.toBeNull();
  });

  it('strips a leading postal code before querying (GSI returns no results otherwise)', async () => {
    // 本番で実際に確認した挙動: GSIは「〒123-4567 ...」のように郵便番号付きで検索すると
    // 該当なし(空配列)を返す。郵便番号を除いた住所だけで問い合わせる必要がある。
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ geometry: { coordinates: [130.543762, 31.582781] } }],
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await geocodeAddress('〒890-0053　鹿児島市中央町18番地1');

    expect(result).toEqual({ lat: 31.582781, lng: 130.543762 });
    const requestedUrl = fetchMock.mock.calls[0][0] as string;
    expect(requestedUrl).not.toContain(encodeURIComponent('〒'));
    expect(requestedUrl).toContain(encodeURIComponent('鹿児島市中央町18番地1'));
  });

  it('strips a postal code with no leading 〒 symbol too', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ geometry: { coordinates: [130.4017, 33.5902] } }],
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await geocodeAddress('810-0001 福岡県福岡市中央区天神2丁目8-35');

    const requestedUrl = fetchMock.mock.calls[0][0] as string;
    expect(requestedUrl).toContain(encodeURIComponent('福岡県福岡市中央区天神2丁目8-35'));
    expect(requestedUrl).not.toContain('810-0001');
  });
});
