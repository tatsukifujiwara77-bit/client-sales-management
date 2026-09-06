import { BadRequestException } from '@nestjs/common';
import { MapService } from './map.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';

interface MockResult {
  data: unknown;
  error: unknown;
}

function createBuilderMock(result: MockResult) {
  const calls: Record<string, unknown[][]> = {};
  const chainMethods = ['select', 'not', 'eq', 'gte', 'lte', 'or', 'limit'] as const;
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    calls[method] = [];
    builder[method] = (...args: unknown[]) => {
      calls[method].push(args);
      return builder;
    };
  }
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
  (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(result);
  return { builder, calls };
}

function buildSupabaseRequestServiceMock(builder: unknown): SupabaseRequestService {
  return { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
}

describe('MapService', () => {
  it('excludes clients without coordinates and maps rows to pins', async () => {
    const row = {
      id: 'client-1',
      company_name: '南国殖産株式会社',
      lat: 33.5,
      lng: 130.4,
      address: '福岡市中央区',
      temperature: 'high',
      sales_stage: { id: 'stage-1', name: '商談', is_closed: false },
      office: { id: 'office-1', name: '九州営業部' },
    };
    const { builder, calls } = createBuilderMock({ data: [row], error: null });
    const service = new MapService(buildSupabaseRequestServiceMock(builder));

    const result = await service.getMapClients({ limit: 500 });

    expect(calls.not).toEqual(
      expect.arrayContaining([
        ['lat', 'is', null],
        ['lng', 'is', null],
      ]),
    );
    expect(result).toEqual([
      {
        id: 'client-1',
        companyName: '南国殖産株式会社',
        lat: 33.5,
        lng: 130.4,
        address: '福岡市中央区',
        temperature: 'high',
        salesStage: { id: 'stage-1', name: '商談', isClosed: false },
        office: { id: 'office-1', name: '九州営業部' },
      },
    ]);
  });

  it('applies the bounding box filter only when all 4 corners are provided', async () => {
    const { builder, calls } = createBuilderMock({ data: [], error: null });
    const service = new MapService(buildSupabaseRequestServiceMock(builder));

    await service.getMapClients({ swLat: 33.0, swLng: 130.0, neLat: 34.0, neLng: 131.0, limit: 500 });

    expect(calls.gte).toEqual(expect.arrayContaining([['lat', 33.0], ['lng', 130.0]]));
    expect(calls.lte).toEqual(expect.arrayContaining([['lat', 34.0], ['lng', 131.0]]));
  });

  it('throws BadRequestException when only some bounding box corners are provided', async () => {
    const { builder } = createBuilderMock({ data: [], error: null });
    const service = new MapService(buildSupabaseRequestServiceMock(builder));

    await expect(service.getMapClients({ swLat: 33.0, limit: 500 })).rejects.toThrow(BadRequestException);
  });
});
