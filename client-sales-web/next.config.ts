import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ホームディレクトリ直下に無関係なpackage-lock.jsonが存在し、Turbopackの
  // プロジェクトルート自動検出が誤爆するため、明示的に固定する。
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
