'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MapClientPin } from '@/lib/api/types';

/** ピンが1件もない場合のデフォルト表示（福岡中心・広め） */
export const DEFAULT_MAP_CENTER: [number, number] = [33.5902, 130.4017];
export const DEFAULT_MAP_ZOOM = 10;
/** ピンが1件だけの場合のズームレベル（fitBoundsは1点だと最大までズームしてしまうため固定値にする） */
const SINGLE_PIN_ZOOM = 14;

/**
 * 表示中のピン一覧が画面内に収まるよう、地図の表示範囲(中心・ズーム)を自動調整する。
 *
 * <MapContainer>のcenter/zoom propsは初回マウント時にしか使われない(react-leafletの仕様上、
 * マウント後にpropsだけ変更しても地図は動かない)。以前はこの2つのpropsに、ピン一覧の
 * 単純な緯度経度の平均値+固定ズーム(12)を渡していたため、(1)マウント後に検索してピンが
 * 変わっても地図は一切動かず、(2)ピン同士が離れている場合は平均値がどのピンとも無関係な
 * 場所(海上など)になった上に固定ズームのせいで画面内にピンが1つも入らない、という
 * 2つの不具合があった。useMap()経由でLeafletのfitBounds()を命令的に呼ぶことで、
 * 実際にピンが収まる範囲・ズームを都度計算して反映する。
 *
 * mode:
 * - 'always'(既定): pinsが変わるたびに(shouldFitがtrueの間)フィットし直す。
 *   通常のフィルタ検索では毎回フィットしたいが、「このエリアで検索」でユーザーが
 *   指定した範囲まで自動で動かしてしまうと、その場でエリアを指定した意味がなくなる
 *   ため、呼び出し側でそのときだけshouldFitをfalseにする想定。
 * - 'once': 初回(マウント直後)の1回だけフィットし、以降pinsが変わっても何もしない。
 *   ダッシュボードのミニ地図のように、フィルタUIを持たず「このエリアで検索」しか
 *   操作手段がない場合に使う(初期表示だけ直し、以降は常にユーザーの操作を優先する)。
 */
export function MapAutoFit({
  pins,
  shouldFit = true,
  mode = 'always',
}: {
  pins: MapClientPin[];
  shouldFit?: boolean;
  mode?: 'always' | 'once';
}) {
  const map = useMap();
  const hasFittedOnce = useRef(false);

  useEffect(() => {
    if (mode === 'once' && hasFittedOnce.current) return;
    if (!shouldFit) return;
    hasFittedOnce.current = true;

    if (pins.length === 0) {
      map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
      return;
    }
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], SINGLE_PIN_ZOOM);
      return;
    }
    const bounds = L.latLngBounds(pins.map((pin): [number, number] => [pin.lat, pin.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    // mode/mapは実行有無・フィット先を変えない安定した値のため依存配列から意図的に外している
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, shouldFit]);

  return null;
}
