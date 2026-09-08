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
});
