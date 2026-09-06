import { Dancing_Script, Sacramento } from 'next/font/google';

/** 手書き風スクリプトフォント。サイドバー装飾文言・アクションカードの見出しで使用する。 */
export const dancingScript = Dancing_Script({ subsets: ['latin'], weight: ['600', '700'] });

/** ヒーローバナー「Hello!」専用の、大きなループが流れるように連なるスクリプトフォント（デザイン画像準拠）。 */
export const heroGreetingFont = Sacramento({ subsets: ['latin'], weight: '400' });
