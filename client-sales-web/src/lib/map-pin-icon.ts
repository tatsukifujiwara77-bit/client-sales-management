import L from 'leaflet';
import type { Temperature } from '@/lib/domain-labels';

const TEMPERATURE_PIN_COLOR: Record<Temperature, string> = {
  high: 'var(--color-destructive)',
  medium: 'var(--color-warning)',
  low: 'var(--color-info)',
  unknown: 'var(--color-muted-foreground)',
};

/**
 * 地図上のクライアントピンをティアドロップ型のマーカーアイコンで表現する。
 * Leafletの既定マーカー(青い画像アイコン)はNext.js等のバンドラー環境だと
 * 画像アセットのパス解決が壊れやすい定番の落とし穴のため、インラインSVGの
 * DivIcon(画像を経由しない)を使う。温度感で色分けし、一目でクライアントの
 * 存在・温度感が分かるようにする。
 */
export function createClientPinIcon(temperature: Temperature): L.DivIcon {
  const color = TEMPERATURE_PIN_COLOR[temperature];
  return L.divIcon({
    className: '',
    html: `
      <svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));">
        <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.716 23.284 0 15 0z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="15" cy="15" r="5.5" fill="white"/>
      </svg>
    `,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
    tooltipAnchor: [0, -30],
  });
}
