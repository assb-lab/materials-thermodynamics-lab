# Materials Thermodynamics Lab

Materials Project の計算データを使い、擬三元系断面と電気化学的安定性をブラウザで計算するアプリです。

| 画面         | 機能                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| 擬三元系相図 | 3 端成分で定義する断面、相分解、反応線、SVG 出力                                                                |
| 反応電位計算 | 開放イオン系の相平衡、反応電位と安定性ウィンドウ、相の除外、体積膨張率、被膜厚みと粒子断面、SVG・CSV・JSON 出力 |

両画面で日本語・英語、ライト・ダーク・自動を切り替えられます。ブラウザに保存した MP API キーは両画面で使えます。MP の Cl–Li–P–S サンプルを使うと API キーなしで計算できます。反応電位画面には架空のエネルギーを使ったデモもあります。

## ローカルで起動

Node.js 26 と pnpm 12 を使います。

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm preview
```

Vite+、Vite React プラグイン、Tailwind CSS、TanStack Router を使用しています。ビルド出力は `dist/` です。ハッシュルーティングを使うため、静的ホストのサブディレクトリでもルートごとの書き換え設定は不要です。

`pnpm dev` と `pnpm preview` は `/mp-api` を Materials Project に中継します。静的ホストでは画面の取得コマンドで MP JSON を保存し、ファイルとして読み込みます。反応電位画面はエントリ JSON と pymatgen の ComputedEntry JSON も読み込めます。

## 移植元とデータ

- [pseudo-ternary-phase-diagram](https://github.com/assb-lab/pseudo-ternary-phase-diagram/tree/719d216) の画面、計算ロジック、サンプル。
- [reaction-voltage-calculator](https://github.com/assb-lab/reaction-voltage-calculator/tree/e63f26d) の計算ロジック、インタラクティブなグラフ、pymatgen と MP の参照テスト。

アプリのコードは [MIT License](LICENSE)。`src/sample/` と [テスト用 MP データ](tests/mp/README.md) は Materials Project の Cl–Li–P–S 系（GGA/GGA+U/R2SCAN、データベース版 2026-09-28）で、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) に従います。A. Jain et al., “Commentary: The Materials Project”, _APL Mater._ **1**, 011002 (2013).
