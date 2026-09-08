import { heroGreetingFont } from '@/lib/fonts';

const WEEKDAY_LABELS_JA = ['日', '月', '火', '水', '木', '金', '土'];

interface HeroBannerProps {
  userName: string;
  /** 今週の訪問予定件数（KPI「訪問」と同じ集計に基づく実データ） */
  weeklyVisitCount: number;
}

/** Hello! の右上に添える光のアクセント（デザイン画像準拠：4方向に伸びる筋＋短い斜めの筋の二重星） */
function SparkleAccent() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 40"
      className="absolute -top-[0.32em] -right-[0.55em] size-[0.42em] text-white/90"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
    >
      <path d="M20 2v14M20 24v14M2 20h14M24 20h14" />
      <path d="M8 8l5 5M27 27l5 5M32 8l-5 5M13 27l-5 5" opacity="0.55" />
    </svg>
  );
}

/**
 * 朝焼けの都市景観を模した背景装飾。
 * 実画像を使わず、複数のグラデーション／ぼかしレイヤーとSVGシルエットのみで再現する。
 */
function SkylineBackground() {
  return (
    <>
      {/* レイヤー1: 空の下地（左は淡い青、中央〜右は白〜淡い黄金色へ） */}
      <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.86_0.045_242)] via-[oklch(0.95_0.025_95)] to-[oklch(0.9_0.05_75)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[oklch(0.93_0.05_75)]/70" />

      {/* レイヤー2: 中央付近の朝日の光 */}
      <div className="absolute top-[8%] left-[58%] size-[42%] rounded-full bg-[oklch(0.99_0.03_85)]/90 blur-[6cqw]" />
      <div className="absolute top-[20%] left-[64%] size-[20%] rounded-full bg-[oklch(0.99_0.02_90)] blur-[3cqw]" />

      {/* レイヤー3: 右側の暖色の光だまり */}
      <div className="absolute top-0 right-[-6%] size-[46%] rounded-full bg-[oklch(0.88_0.08_60)]/60 blur-[7cqw]" />

      {/* レイヤー4: 左下の淡いブルー（山並みのシルエット） */}
      <div className="absolute bottom-0 left-[-8%] h-[46%] w-[60%] rounded-[50%] bg-[oklch(0.78_0.05_246)]/50 blur-[3cqw]" />
      <div className="absolute bottom-0 left-[6%] h-[34%] w-[42%] rounded-[50%] bg-[oklch(0.82_0.045_246)]/45 blur-[2.5cqw]" />

      {/* レイヤー5: 空の雲（横に長い柔らかい筋雲） */}
      <div className="absolute top-[14%] left-[8%] h-[6%] w-[26%] rounded-full bg-white/45 blur-[1.6cqw]" />
      <div className="absolute top-[26%] left-[2%] h-[5%] w-[20%] rounded-full bg-white/35 blur-[1.6cqw]" />
      <div className="absolute top-[10%] left-[40%] h-[5%] w-[16%] rounded-full bg-white/40 blur-[1.4cqw]" />

      {/* レイヤー6: 都市のスカイライン（右寄りに配置、下端に自然に溶け込む）。奥行きを出すため遠景/近景/水面反射の3段構成にする */}
      <svg
        aria-hidden
        viewBox="0 0 1000 340"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-[26%] h-[48%] w-[74%]"
      >
        <defs>
          <filter id="heroWaterBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <filter id="heroWaterBlurSoft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          {/* 波打ち際は濃く、離れるほど透明にフェードさせるマスク（鏡面反射→ぼやけて消える自然な水面表現） */}
          <linearGradient id="heroReflFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.85" />
            <stop offset="55%" stopColor="white" stopOpacity="0.35" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="heroReflMask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="340">
            <rect x="0" y="300" width="1000" height="40" fill="url(#heroReflFade)" />
          </mask>
          {/* 水面のさざ波で反射が横に細かくズレる帯（下にいくほど乱れを大きくする） */}
          <clipPath id="heroReflBand0">
            <rect x="0" y="300" width="1000" height="5" />
          </clipPath>
          <clipPath id="heroReflBand1">
            <rect x="0" y="305" width="1000" height="6" />
          </clipPath>
          <clipPath id="heroReflBand2">
            <rect x="0" y="311" width="1000" height="6" />
          </clipPath>
          <clipPath id="heroReflBand3">
            <rect x="0" y="317" width="1000" height="7" />
          </clipPath>
          <clipPath id="heroReflBand4">
            <rect x="0" y="324" width="1000" height="8" />
          </clipPath>
          <clipPath id="heroReflBand5">
            <rect x="0" y="332" width="1000" height="8" />
          </clipPath>

          {/* 都市のシルエット本体を一度だけ定義し、実景と水面反射の両方から<use>で参照する（反射が実景と完全に一致するように） */}
          <g id="heroCity">
            {/* 最遠景（うっすらとかすむ稜線、大気遠近感を出す） */}
            <g fill="oklch(0.82 0.03 248)" opacity="0.45">
              <rect x="0" y="185" width="90" height="115" />
              <rect x="95" y="165" width="70" height="135" />
              <rect x="860" y="175" width="70" height="125" />
              <rect x="935" y="150" width="65" height="150" />
            </g>
            {/* 遠景（かすんだ低いビル群） */}
            <g fill="oklch(0.72 0.045 250)" opacity="0.55">
              <rect x="0" y="150" width="60" height="150" />
              <rect x="70" y="120" width="50" height="180" />
              <rect x="130" y="165" width="70" height="135" />
              <rect x="740" y="140" width="60" height="160" />
              <rect x="810" y="170" width="80" height="130" />
              <rect x="900" y="130" width="60" height="170" />
            </g>
            {/* 近景（濃いめのビル群。太陽側＝右端をわずかに明るくして光の当たり方を表現） */}
            <g fill="oklch(0.46 0.075 262)" opacity="0.94">
              <rect x="210" y="190" width="55" height="110" />
              <rect x="270" y="140" width="40" height="160" />
              <rect x="315" y="210" width="65" height="90" />
              <rect x="385" y="170" width="45" height="130" />
              <rect x="435" y="205" width="55" height="95" />
              <rect x="495" y="150" width="42" height="150" />
              <rect x="542" y="185" width="60" height="115" />
              <rect x="607" y="120" width="46" height="180" />
              <rect x="658" y="200" width="58" height="100" />
              <rect x="720" y="160" width="44" height="140" />
            </g>
            <g fill="oklch(0.5 0.07 268)" opacity="0.9">
              <rect x="850" y="180" width="50" height="120" />
              <rect x="905" y="150" width="55" height="150" />
              <rect x="960" y="195" width="40" height="105" />
            </g>
            {/* 電波塔（シルエットのアクセント） */}
            <g>
              <polygon points="640,300 656,60 664,60 680,300" fill="oklch(0.42 0.08 262)" />
              <rect x="638" y="130" width="44" height="7" fill="oklch(0.42 0.08 262)" />
              <rect x="644" y="90" width="32" height="6" fill="oklch(0.42 0.08 262)" />
              <circle cx="660" cy="56" r="6" fill="oklch(0.6 0.19 30)" />
            </g>
            {/* ビルの灯り（控えめな点） */}
            <g fill="oklch(0.97 0.06 85)" opacity="0.6">
              <rect x="225" y="205" width="6" height="6" />
              <rect x="400" y="190" width="6" height="6" />
              <rect x="520" y="175" width="6" height="6" />
              <rect x="670" y="180" width="6" height="6" />
              <rect x="870" y="205" width="6" height="6" />
            </g>
          </g>
        </defs>

        <use href="#heroCity" />

        {/*
          水面への映り込み。実景(#heroCity)を上下反転・圧縮した<use>を、水平の帯ごとに
          わずかに左右へずらして重ねることで、鏡のような一枚絵ではなく細波で崩れた反射に近づける。
          波打ち際に近いほどシャープに、離れるほど大きくずれてぼやけるようにしている。
        */}
        <g mask="url(#heroReflMask)">
          <g clipPath="url(#heroReflBand0)">
            <use href="#heroCity" transform="translate(0,300) scale(1,-0.42) translate(0,-300)" opacity="0.92" />
          </g>
          <g filter="url(#heroWaterBlur)">
            <g clipPath="url(#heroReflBand1)">
              <use
                href="#heroCity"
                transform="translate(0,300) scale(1,-0.42) translate(0,-300) translate(3,0)"
                opacity="0.8"
              />
            </g>
            <g clipPath="url(#heroReflBand2)">
              <use
                href="#heroCity"
                transform="translate(0,300) scale(1,-0.42) translate(0,-300) translate(-4,0)"
                opacity="0.72"
              />
            </g>
            <g clipPath="url(#heroReflBand3)">
              <use
                href="#heroCity"
                transform="translate(0,300) scale(1,-0.42) translate(0,-300) translate(5,0)"
                opacity="0.6"
              />
            </g>
          </g>
          <g filter="url(#heroWaterBlurSoft)">
            <g clipPath="url(#heroReflBand4)">
              <use
                href="#heroCity"
                transform="translate(0,300) scale(1,-0.42) translate(0,-300) translate(-7,0)"
                opacity="0.45"
              />
            </g>
            <g clipPath="url(#heroReflBand5)">
              <use
                href="#heroCity"
                transform="translate(0,300) scale(1,-0.42) translate(0,-300) translate(8,0)"
                opacity="0.3"
              />
            </g>
          </g>
          {/* 水面の色味（わずかに寒色寄りに転ぶ、水らしいトーン差） */}
          <rect x="0" y="300" width="1000" height="40" fill="oklch(0.55 0.09 235)" opacity="0.06" />
        </g>
        {/* 波打ち際のきわを引き締める細いハイライト */}
        <line x1="0" y1="301" x2="1000" y2="301" stroke="oklch(0.98 0.05 85)" strokeWidth="1" opacity="0.5" />
        {/* さざ波（水面の細い光の筋） */}
        <g stroke="oklch(0.98 0.05 85)" strokeWidth="2" opacity="0.4">
          <line x1="60" y1="312" x2="220" y2="312" />
          <line x1="380" y1="322" x2="520" y2="322" />
          <line x1="600" y1="308" x2="760" y2="308" />
          <line x1="800" y1="328" x2="960" y2="328" />
        </g>
      </svg>

      {/* レイヤー7: 水面（下端の暖色の光の反射で水平線を馴染ませる。反射が透けるよう控えめに） */}
      <div className="absolute inset-x-0 bottom-0 h-[8%] bg-gradient-to-t from-[oklch(0.93_0.06_75)]/55 to-transparent" />
      <div className="absolute bottom-0 left-[45%] h-[7%] w-[38%] rounded-full bg-[oklch(0.98_0.05_85)]/70 blur-[2cqw]" />
    </>
  );
}

/** ダッシュボード最上部のヒーローバナー（デザイン画像準拠）。挨拶・今週の状況・日付を表示する。 */
export function HeroBanner({ userName, weeklyVisitCount }: HeroBannerProps) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const weekday = WEEKDAY_LABELS_JA[now.getDay()];

  return (
    <div className="@container relative isolate aspect-[3/1] w-full overflow-hidden rounded-[28px] [mask-image:radial-gradient(white,white)]">
      <SkylineBackground />

      <div className="relative flex h-full items-center justify-between gap-[3%] px-[4.5%]">
        {/* 左エリア: 挨拶・メインメッセージ・サブメッセージ */}
        <div className="min-w-0">
          <p
            className={`${heroGreetingFont.className} relative inline-block text-[8.6cqw] leading-none text-white/85 drop-shadow-[0_1px_8px_rgba(30,58,138,0.3)]`}
          >
            Hello!
            <SparkleAccent />
          </p>
          <p className="mt-[3%] text-[2.5cqw] leading-snug font-bold tracking-tight text-[oklch(0.26_0.05_260)]">
            {userName}さん、今日もいい1日にしましょう！
          </p>
          <p className="mt-[1.6%] text-[1.65cqw] leading-snug text-[oklch(0.4_0.03_255)]">
            今週は{' '}
            <span className="text-[2.3cqw] font-bold text-[oklch(0.55_0.19_258)]">{weeklyVisitCount}</span>{' '}
            件の訪問予定があります。目標に向けて一歩ずつ進めましょう！
          </p>
        </div>

        {/* 右エリア: 日付（薄い区切り線で背景から独立させる） */}
        <div className="flex shrink-0 items-center gap-[3%]">
          <div className="h-[65%] w-px bg-[oklch(0.35_0.02_255)]/20" />
          <div className="text-right text-[oklch(0.4_0.03_255)]">
            <p className="text-[1.4cqw] tracking-wide">{now.getFullYear()}</p>
            <p className="text-[2.9cqw] leading-tight font-bold tracking-tight text-[oklch(0.24_0.05_260)]">
              {month}.{day}
            </p>
            <p className="text-[1.4cqw]">（{weekday}）</p>
          </div>
        </div>
      </div>
    </div>
  );
}
