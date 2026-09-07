import { Dancing_Script, Alex_Brush } from 'next/font/google';

/** 手書き風スクリプトフォント。サイドバー装飾文言・アクションカードの見出しで使用する。 */
export const dancingScript = Dancing_Script({ subsets: ['latin'], weight: ['600', '700'] });

/**
 * ヒーローバナー「Hello!」専用のブラシスクリプトフォント（デザイン画像準拠）。
 * Sacramento/Dancing Scriptは線の太さが均一(モノライン)なのに対し、
 * Alex Brushは実際の筆記具のような太字・細字の強弱があり、デザイン画像の筆致に近い。
 */
export const heroGreetingFont = Alex_Brush({ subsets: ['latin'], weight: '400' });
