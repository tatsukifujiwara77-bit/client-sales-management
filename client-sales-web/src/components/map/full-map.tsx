'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clientFetchApi } from '@/lib/api/client';
import { TEMPERATURE_LABELS, type Temperature } from '@/lib/domain-labels';
import type { MapClientPin, Office, SalesStage } from '@/lib/api/types';

const ALL = '__all__';

const TEMPERATURE_MARKER_COLOR: Record<Temperature, string> = {
  high: 'var(--color-destructive)',
  medium: 'var(--color-warning)',
  low: 'var(--color-info)',
  unknown: 'var(--color-muted-foreground)',
};

const FUKUOKA_CENTER: [number, number] = [33.5902, 130.4017];

function SearchThisAreaButton({ onSearch }: { onSearch: (bounds: LatLngBounds) => void }) {
  const map = useMap();

  return (
    <Button
      type="button"
      size="sm"
      className="absolute bottom-3 left-3 z-[1000] shadow-md"
      onClick={() => onSearch(map.getBounds())}
    >
      このエリアで検索
    </Button>
  );
}

interface FullMapProps {
  initialPins: MapClientPin[];
  offices: Office[];
  salesStages: SalesStage[];
}

/** 地図画面（設計書 11.4「エリア別クライアントマップ」のフルスクリーン版）。 */
export function FullMap({ initialPins, offices, salesStages }: FullMapProps) {
  const [pins, setPins] = useState(initialPins);
  const [isLoading, setIsLoading] = useState(false);
  const [officeId, setOfficeId] = useState(ALL);
  const [temperature, setTemperature] = useState(ALL);
  const [salesStageId, setSalesStageId] = useState(ALL);
  const [searchInput, setSearchInput] = useState('');

  const center = useMemo<[number, number]>(() => {
    if (pins.length === 0) return FUKUOKA_CENTER;
    const avgLat = pins.reduce((sum, p) => sum + p.lat, 0) / pins.length;
    const avgLng = pins.reduce((sum, p) => sum + p.lng, 0) / pins.length;
    return [avgLat, avgLng];
  }, [pins]);

  async function search(bounds?: LatLngBounds) {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (officeId !== ALL) params.set('officeId', officeId);
      if (temperature !== ALL) params.set('temperature', temperature);
      if (salesStageId !== ALL) params.set('salesStageId', salesStageId);
      if (searchInput.trim()) params.set('search', searchInput.trim());
      if (bounds) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        params.set('swLat', String(sw.lat));
        params.set('swLng', String(sw.lng));
        params.set('neLat', String(ne.lat));
        params.set('neLng', String(ne.lng));
      }
      const result = await clientFetchApi<MapClientPin[]>(`/map/clients?${params.toString()}`);
      setPins(result);
    } catch {
      // 検索失敗は致命的ではないため、既存のピン表示を維持する
    } finally {
      setIsLoading(false);
    }
  }

  const officeItems = [{ value: ALL, label: 'すべての拠点' }, ...offices.map((o) => ({ value: o.id, label: o.name }))];
  const temperatureValues: Temperature[] = ['high', 'medium', 'low', 'unknown'];
  const temperatureItems = [
    { value: ALL, label: 'すべての温度感' },
    ...temperatureValues.map((t) => ({ value: t, label: TEMPERATURE_LABELS[t] })),
  ];
  const stageItems = [
    { value: ALL, label: 'すべてのフェーズ' },
    ...salesStages.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') search();
          }}
          placeholder="会社名・所在地で検索"
          className="min-w-48 flex-1"
        />

        <Select items={officeItems} defaultValue={ALL} onValueChange={(v) => setOfficeId(v ?? ALL)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="拠点" />
          </SelectTrigger>
          <SelectContent>
            {officeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select items={temperatureItems} defaultValue={ALL} onValueChange={(v) => setTemperature(v ?? ALL)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="温度感" />
          </SelectTrigger>
          <SelectContent>
            {temperatureItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select items={stageItems} defaultValue={ALL} onValueChange={(v) => setSalesStageId(v ?? ALL)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="営業フェーズ" />
          </SelectTrigger>
          <SelectContent>
            {stageItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size="sm" onClick={() => search()} disabled={isLoading}>
          検索
        </Button>
      </div>

      <div className="relative min-h-[28rem] flex-1 overflow-hidden rounded-lg">
        <MapContainer center={center} zoom={12} scrollWheelZoom className="size-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pins.map((pin) => (
            <CircleMarker
              key={pin.id}
              center={[pin.lat, pin.lng]}
              radius={9}
              pathOptions={{
                color: 'white',
                weight: 2,
                fillColor: TEMPERATURE_MARKER_COLOR[pin.temperature],
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="flex min-w-40 flex-col gap-1">
                  <p className="font-semibold text-foreground">{pin.companyName}</p>
                  {pin.address ? <p className="text-xs text-muted-foreground">{pin.address}</p> : null}
                  <p className="text-xs text-muted-foreground">
                    {pin.salesStage.name} ・ {TEMPERATURE_LABELS[pin.temperature]}
                  </p>
                  <Link href={`/clients/${pin.id}`} className="text-xs font-medium text-primary hover:underline">
                    クライアント詳細を見る →
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          <SearchThisAreaButton onSearch={search} />
        </MapContainer>
        {isLoading ? (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/50 text-sm text-muted-foreground">
            検索中…
          </div>
        ) : null}
      </div>
    </div>
  );
}
