'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { clientFetchApi } from '@/lib/api/client';
import { createClientPinIcon } from '@/lib/map-pin-icon';
import type { MapClientPin } from '@/lib/api/types';

const FUKUOKA_CENTER: [number, number] = [33.5902, 130.4017];

function SearchThisAreaButton({ onSearch }: { onSearch: (bounds: LatLngBounds) => void }) {
  const map = useMap();

  return (
    <Button
      type="button"
      size="sm"
      className="absolute bottom-3 left-3 z-[1000] rounded-full shadow-soft-md"
      onClick={() => onSearch(map.getBounds())}
    >
      このエリアで検索
    </Button>
  );
}

export function ClientMap({ initialPins }: { initialPins: MapClientPin[] }) {
  const [pins, setPins] = useState(initialPins);
  const [isLoading, setIsLoading] = useState(false);

  const center = useMemo<[number, number]>(() => {
    if (pins.length === 0) return FUKUOKA_CENTER;
    const avgLat = pins.reduce((sum, p) => sum + p.lat, 0) / pins.length;
    const avgLng = pins.reduce((sum, p) => sum + p.lng, 0) / pins.length;
    return [avgLat, avgLng];
  }, [pins]);

  async function handleSearchThisArea(bounds: LatLngBounds) {
    setIsLoading(true);
    try {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const params = new URLSearchParams({
        swLat: String(sw.lat),
        swLng: String(sw.lng),
        neLat: String(ne.lat),
        neLng: String(ne.lng),
      });
      const result = await clientFetchApi<MapClientPin[]>(`/map/clients?${params.toString()}`);
      setPins(result);
    } catch {
      // 地図の再検索失敗は致命的ではないため、既存のピン表示を維持する
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="relative overflow-hidden [mask-image:radial-gradient(white,white)] rounded-bl-[3.25rem] bg-gradient-to-br from-white to-[oklch(0.97_0.015_255)]">
      {/* カード固有の装飾: 地図らしいシアン〜グリーンの淡いグロー＋座標グリッドを思わせるドットパターン */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -left-10 size-36 rounded-full bg-[oklch(0.68_0.13_190)]/12 blur-2xl"
      />
      <svg aria-hidden viewBox="0 0 120 60" className="pointer-events-none absolute top-0 left-0 h-16 w-32 opacity-70">
        <defs>
          <pattern id="mapDotGrid" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="oklch(0.68 0.13 190)" />
          </pattern>
        </defs>
        <rect width="120" height="60" fill="url(#mapDotGrid)" />
      </svg>
      <CardHeader className="relative flex-row items-center justify-between">
        <CardTitle>エリア別クライアントマップ</CardTitle>
        <Link href="/map" className="text-xs font-medium text-primary hover:underline">
          すべて見る →
        </Link>
      </CardHeader>
      <CardContent className="relative">
        <div className="relative h-72 overflow-hidden rounded-xl rounded-bl-[2.25rem]">
          <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="size-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pins.map((pin) => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={createClientPinIcon(pin.temperature)}>
                <Tooltip>{pin.companyName}</Tooltip>
              </Marker>
            ))}
            <SearchThisAreaButton onSearch={handleSearchThisArea} />
          </MapContainer>
          {isLoading ? (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/50 text-sm text-muted-foreground">
              検索中…
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
