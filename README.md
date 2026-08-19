# 傾斜割り勘（warikan）

副業プロジェクト Webツール第1号。**公開候補ビルドとして品質監査済み**（2026-08-19）。

「先輩は多め、後輩は少なめ。立場に合わせて、ちょうどよく割り勘。」

学年・OB/OG・会社の役職や年次・運転してくれた人・お酒を飲んでいない人・途中参加など、
現実の飲み会や旅行で起きる「傾斜のある割り勘」を、スマホで30秒以内に計算できることを目標にしたツール。

## コンセプト

- 均等割りではなく、支払いグループごとの「傾斜」で按分する
- テンプレート（「誰との割り勘？」）は固定の選択肢ではなく「初期状態を素早く作るプリセット」。いつでも自由に編集できる
- 学年・役職・友人関係などはすべて内部的に共通の「支払いグループ（グループ名＋傾斜比率）」として扱う
- 個別の金額・割合調整（運転手・お酒を飲まない・途中参加など）を、合計金額を崩さずに他の参加者へ再配分する
- 100円単位などに丸めた際の端数処理方法を5種類から選べる
- 初心者向けの通常画面では「倍率」「比率」といった計算用語を前面に出さず、多め／やや多め／普通／やや少なめ／少なめのラベルで完結する（数値を直接編集したい人だけ「数値で細かく設定」を開く）

## 使用技術と選定理由

| 技術 | 理由 |
|---|---|
| **Astro**（静的サイト生成） | ページはビルド時に静的HTMLとして出力されるためSEO・表示速度に強い。サーバーやDBが不要で維持費0円のホスティング（Cloudflare Pages/Vercel/Netlify/GitHub Pagesなど）にそのままデプロイできる。ファイルベースルーティングが`/tools/warikan/`のような将来のURL構造とも相性が良く、ツールを追加するたびに`src/pages/tools/○○/`を増やすだけで拡張できる |
| **Preact**（割り勘計算UIのみ） | ページの大部分は静的HTMLのままにしつつ、計算ツール部分だけを「アイランド」として軽量にインタラクティブ化。Reactよりバンドルサイズが小さくCore Web Vitalsに有利 |
| **Tailwind CSS v4** | スマホファーストなUIをユーティリティクラスで高速に構築。カスタムCSSをほぼ書かずに済み、保守コストが低い |
| **TypeScript** | 計算ロジック（金額を扱う部分）の型安全性を確保 |
| **Vitest** | 計算ロジックの自動テストに使用。ビルド設定（Vite）と統合しやすい |

ログイン・DB・外部API・AI APIは一切使用していない。すべてブラウザ内で完結し、外部への通信も発生しない（監査済み）。

## ディレクトリ構成

```
src/
  lib/warikan/       … 計算ロジック（フレームワーク非依存、テスト対象）
    types.ts           型定義
    calculator.ts       傾斜按分・個別調整の中心ロジック
    rounding.ts         端数処理ロジック
    templates.ts        テンプレート定義
    reasons.ts           個別調整の理由プリセット
    names.ts             参加者の自動命名・ID生成
    share.ts              共有用テキスト生成
    clipboard.ts          クリップボードコピー（フォールバック付き）
    format.ts             金額表示フォーマット
    branding.ts           サービス名・キャッチコピー（名称変更時はここだけ直せばよい）
  components/warikan/ … Preactコンポーネント（UI）
    WarikanApp.tsx        画面全体の状態管理と組み立て
    state.ts               useReducer用のreducerと初期状態
    AmountInput.tsx / TemplatePicker.tsx / GroupEditor.tsx /
    ParticipantEditor.tsx / RoundingSettings.tsx / ResultView.tsx / ShareCard.tsx
  layouts/Layout.astro … 共通レイアウト（SEOメタタグ、OGP、Twitter Card、canonical）
  pages/
    index.astro           トップページ
    tools/index.astro      ツール一覧
    tools/warikan/index.astro  割り勘ツール本体＋SEOコンテンツ＋FAQ構造化データ
    robots.txt.ts          robots.txt（sitemap.xmlへのリンクを自動生成）
```

`@astrojs/sitemap`によりビルド時に`sitemap-index.xml`が自動生成される。

## 起動方法

```bash
cd web-tools/warikan
npm install
npm run dev       # http://localhost:4321 で起動
```

その他のコマンド：

```bash
npm run build      # 本番用に静的サイトをビルド（dist/に出力）
npm run preview    # ビルド結果をローカルで確認
npm test           # 計算ロジックの自動テスト（Vitest）
npx astro check    # 型チェック
```

## 現在実装済みの機能

- 合計金額の入力（数字キーボード対応、十分なタップ領域）
- シチュエーション選択「誰との割り勘？」（大学生・サークル／会社・職場／友人との飲み会／ドライブ・旅行／誕生日会／完全カスタム）
- 支払いグループの追加・削除・名前変更・比率変更（多め〜少なめのラベル操作＋数値での細かい設定）
- グループの並び順はテンプレート選択時に決まる（学年・役職として自然な上位→下位）。**比率変更・グループ追加・名前変更では並び順は一切変わらない**（操作中にカードが動かない設計）
- 参加者の追加・削除・名前入力（未入力時はAさん・Bさん…の自動命名）・グループ割り当て
- 参加者ごとの個別調整（±円 または ±%）と理由の選択（運転してくれた／車を出してくれた／お酒を飲んでいない／途中参加／途中退出／幹事／誕生日／その他〈自由入力〉）
- 個別調整をしても合計金額が変わらないよう、他の参加者へ元の傾斜比率を維持したまま自動で再配分。**個別調整の合計が会計金額を超える場合も、誰にも0円未満・会計金額超えの金額を割り当てず、比率どおりに縮小して警告表示する**
- 端数処理：丸め単位（1円／10円／100円／500円／1,000円）と、5種類の端数負担モード（おまかせ／多く払う人が負担／指定した人が負担／みんなで調整／端数として残す）
- 端数を配分しても数学的に元の会計金額と一致しない場合は、その旨を画面に警告として表示（金額を誤魔化さない）
- 計算結果のライブ表示（入力するたびに即時再計算）
- 結果を1タップでクリップボードへコピー（HTTPS等のsecure contextが使えない場合もフォールバックで動作）、対応端末ではWeb Share APIによる共有
- SEO：title / meta description / canonical / OGP / Twitter Card / セマンティックHTML（h1は1つ、h2〜h3の階層構造）/ sitemap.xml / robots.txt / FAQ構造化データ（画面上のFAQと同一内容）/ 下部SEOコンテンツ
- 最低限のアクセシビリティ対応（折りたたみ・選択ボタンのaria-expanded/aria-pressed、フォーム要素のラベル付け）
- `/tools/`ツール一覧ページ（将来のツール追加を想定した構造）

## 未実装（MVPでは見送り）

- ユーザー登録・ログイン
- データベース・クラウド保存（入力内容はページを閉じると消える）
- PayPay等の決済連携・LINE API連携
- AI API連携
- レシートOCR
- アプリ化・有料プラン
- グループの手動並び替え（現在はテンプレート由来の自然順のみ。ドラッグ&ドロップ等は将来検討）
- Google Analytics / Search Console（**公開後に**導入予定。`Layout.astro`に追加するだけで導入できる構造にしてある）
- 広告枠（現時点では非表示。将来AdSense等を追加する際も、ツール操作を邪魔しない位置に追加できるレイアウトにしてある）

## テスト結果（2026-08-19時点）

`npm test`（Vitest）で**48ケースすべて成功**。

- `src/lib/warikan/calculator.test.ts`：傾斜計算・個別調整・端数処理（全単位×全モード）・境界値（0円/1円/99円/999円/20人/同名/倍率0/極端な倍率/単独参加者等）・**個別調整の合計が会計金額を超えるケース**（公開前監査で発見・修正したバグの回帰テスト）
- `src/lib/warikan/share.test.ts`：コピー文章のフォーマット（1人1行、合計金額の一致）
- `src/components/warikan/state.test.ts`：グループの並び順（比率変更で動かないこと、テンプレート適用時の順序）

**実機確認：** iPhone実機（同一Wi-Fi経由のLAN公開）で複数回の修正を経て動作確認済み。

## 今後の改善候補

- 入力内容のブラウザ内保存（localStorage。サーバー保存はしない方針を維持）
- URLへの状態エンコードによる「結果ページの共有リンク」
- テンプレートに応じたFAQ・SEO記事ページの個別URL展開（`/tools/warikan/university/`など）
- 広告枠の追加（AdSense審査通過後）
- OGP画像（og:image）の追加（現在は未設定。デザイン制作が必要）

## 本番公開手順

MVPとして公開候補ビルドの品質監査を完了済み（計算ロジック・境界値・スマホUX・SEO基礎・アクセシビリティ・外部通信なしを確認）。以下は**本番URLが決まり、実際に公開する段階**で行う作業。

1. このディレクトリ（`web-tools/warikan/`）をGitリポジトリとしてGitHub等へpush する
   - CrowdWorks案件情報など副業プロジェクトの他のファイルは含めない。`web-tools/warikan/`単体をリポジトリのルートにする想定
2. Cloudflare Pagesで、そのリポジトリを接続する
3. Build command：`npm run build`
4. Build output directory：`dist`
5. **本番URLが決まったら**、`astro.config.mjs`の`site: 'https://warikan.example.com'`を実際のURLに差し替える（sitemap.xml・canonical URL・OGPの`og:url`・robots.txtのSitemap行がすべてここから自動生成されるため、変更箇所はこの1行のみ）
6. `npm run build`で再ビルドし、`npm run preview`等で最終確認
7. スマホ実機で最終確認（フォーム入力・共有・端数処理など主要導線）
8. 公開後にGoogle Search Console・Google Analyticsを導入（現時点では未設定）

### Cloudflare Pagesでの静的公開について

現在の構成はAstroの`output: "static"`（デフォルト）。Cloudflare固有のadapter（`@astrojs/cloudflare`等）は不要で、追加していない。`npm run build`が生成する`dist/`をそのまま静的ホスティングに配置するだけで動作する構成（Cloudflare Pages / Vercel / Netlify / GitHub Pagesいずれでも同様の手順で公開可能）。
