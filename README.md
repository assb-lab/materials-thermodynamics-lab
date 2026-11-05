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

## CLI と WebMCP

CLI は Node.js 26 上で実行します。標準出力に結果、標準エラーにエラーを出し、失敗時は終了コード 1 を返します。

```sh
pnpm cli section --sample
pnpm cli decompose --sample --point 1,1,1
pnpm cli reaction-line --sample --start 1,0,0 --end 0,1,0
pnpm cli profile --sample --formula Li6PS5Cl --volume
pnpm cli profile --input mp.json --formula Li6PS5Cl --original-energies --format csv
pnpm cli profile --sample --formula Li6PS5Cl --diameter-um 1 --charge-mahg 10
pnpm cli profile --sample --formula Li6PS5Cl --lang ko --format svg --output profile.svg
pnpm cli --help
```

`--input` は複数回指定でき、`--input -` は標準入力を読みます。各計算は MP thermo JSON、アプリのエントリ JSON、pymatgen 形式を扱います。座標は既定で端元の mol 比で、合計を1に正規化します。`--basis atom` は原子比です。電位計算は画面と同じく対象相の hull 補正を既定で有効にします。`--original-energies` で元のエネルギーに切り替えられます。JSON 中の無限大の電位は `null` です。被膜モデルの `--fraction` は 0〜1 で、`--charge-mahg` とは同時に指定しません。被膜の結果は JSON で取得します。各コマンドに適用できないオプションはエラーになります。

Chrome のローカル開発では `chrome://flags/#enable-webmcp-testing` を有効にできます。[Chrome の案内](https://developer.chrome.com/docs/ai/webmcp)を参照してください。

WebMCP 対応ブラウザでは `document.modelContext` に以下のツールを登録します。未対応環境では通常の画面を利用できます。

| ツール                  | 操作                                             |
| ----------------------- | ------------------------------------------------ |
| `materials_status`      | 現在の画面、読み込み済みデータと計算結果を取得   |
| `materials_load_sample` | 現在の画面に実 MP サンプルを読み込み、描画       |
| `materials_analyze`     | CLI と共通のコアで計算し、出典付きの JSON を返す |
| `materials_navigate`    | 相図・電位計算の画面に移動                       |
| `materials_preferences` | 言語・テーマを変更                               |

`materials_analyze` の例は `{"command":"profile","sample":true,"formula":"Li6PS5Cl","volume":true}` です。`data` に JSON テキスト配列を渡せます。`sample` も `data` も指定しない場合は現在の画面の読み込み済みデータを使います。返す計算結果は構造化データで、画面のプロットは `materials_load_sample` 等の画面操作で更新します。

日本語、英語、簡体字中国語、韓国語に対応します。グラフは全テーマで白背景・黒文字です。ツール切り替えは140msのクロスフェードで、OSの動きを減らす設定に従います。
