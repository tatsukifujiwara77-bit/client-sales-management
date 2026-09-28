'use client';

import { useEffect, useState } from 'react';

/**
 * このコードベース初のlocalStorage利用。一覧/業種別の表示モード切替のような
 * 「次回また同じ状態で開きたい」軽量な画面設定の永続化専用(サーバー同期は不要)。
 * SSR時はデフォルト値のまま描画し、マウント後にlocalStorageの値へ追従する。
 */
export function useLocalStorage<T extends string>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      // SSR時のデフォルト値での描画とマウント後の実際の値がズレるのは意図的
      // (localStorageはサーバーで読めないため、ここで追従させるしかない)。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setValue(stored as T);
    } catch {
      // private window等でlocalStorageが使えない場合はデフォルト値のまま
    }
  }, [key]);

  function update(next: T) {
    setValue(next);
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // 保存に失敗しても画面上の状態は反映する(次回開いたときにデフォルトへ戻るだけ)
    }
  }

  return [value, update];
}
