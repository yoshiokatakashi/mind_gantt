# 企画書：マインドマップ形式でWBSを作成し実用的なガントチャートへ変換するWebアプリ

## 1. プロジェクト概要
**名称（案）**: MindGantt / Map2Gantt

**コンセプト**: ユーザーが直感的にマインドマップ（ノードをドラッグして階層化）でWBSを作成し、それを自動で依存関係・工数情報付きの実用的なガントチャートに変換・編集できるWebアプリ。プロジェクト計画→実行→共有のワークフローを高速に回すことを目的とする。

**ホスティング/デプロイ**: Vercel（Frontend: Next.js の静的/ISR/Server Actions、Backend: Serverless API or Edge Functions）

**開発スタンス**: 開発速度重視。既存OSSコンポーネントを活用し、MVP（最小実用製品）を短期間でローンチ。TypeScriptで型安全に開発。

---

## 2. 目的・ユースケース
- プロジェクトマネージャーやチームリーダーが素早くWBSを可視化し、スケジュールに落とし込む
- 会議・キックオフでその場でマインドマップを作成し、即ガントに変換して進捗管理を開始
- 技術的にはクラウド上で共同編集・エクスポート（PDF/PNG/CSV）を提供

**主なユースケース**
1. 視覚的にブレインストーミング → 階層化したタスクを保存
2. 各ノードに担当者・工数・期日・依存関係を付与
3. 自動でガントチャートに変換、クリティカルパス可視化
4. ガント上で日程調整、リソース負荷の確認
5. エクスポート（CSV / PNG / PDF / MS Project 互換）と共有リンク生成

---

## 3. ターゲットユーザー
- 中小企業のプロジェクトマネージャー
- スタートアップのプロダクトマネージャー/チームリード
- フリーランス（複数案件管理）
- 教育用途（授業/ワークショップ）

---

## 4. MVP機能（優先度高）
### コア機能
1. **マインドマップ編集画面**（ドラッグ&ドロップ、ノード追加/削除、階層移動）
   - ライブラリ候補: `react-flow`（柔軟なノード・エッジ）、`cytoscape` など
2. **ノード属性管理**（担当者、期間（開始/終了 or 期日）、推定工数、優先度、メモ）
3. **マインドマップ→ガント変換エンジン**
   - 親子関係をタスクの親子・サブタスクにマッピング
   - 依存関係（Finish-to-Start など）の生成ルール（自動＋手動修正）
4. **ガントチャート表示/編集**
   - ライブラリ候補: `frappe-gantt`、`gantt-task-react`、`react-big-scheduler` など
   - タスクドラッグで日程調整、依存関係編集、工数編集
5. **プロジェクト保存・復元**（DB保存）
6. **共有リンクとエクスポート（CSV, PNG, PDF）**

### MVPで除外（後回し）
- 高度な自動リソース割当アルゴリズム
- リアルタイムコラボ編集（WebSocket） — 「共同編集」は後フェーズで追加
- MS Project直接連携（まずはCSV/PNG/PDF）

---

## 5. 非機能要件
- **パフォーマンス**: 中規模プロジェクト（数百ノード）でもUIが快適に動作
- **スケーラビリティ**: Vercel上のサーバーレス設計で水平スケール
- **セキュリティ**: 認証（OAuth via Supabase/Firebase/GitHub）、プロジェクト共有時のアクセス制御
- **運用性**: Sentry 等でエラー監視、Vercelの自動デプロイ（main→production）

---

## 6. 技術スタック（推奨・開発速度優先）
- **フロントエンド**: Next.js（App Router, TypeScript） + React + Tailwind CSS
  - UI コンポーネント: shadcn/ui（必要最小限で開発速度重視）
  - 状態管理: Zustand（軽量・シンプル）
  - モジュール: マインドマップは `react-flow`、ガントは `gantt-task-react` のみ採用

- **バックエンド****: Serverless API（Next.js API Routes or Server Actions）
  - 認証・DB: **Supabase（Auth + Postgres）** を推奨（セットアップ高速、Vercelとの相性良）
  - ORM: Prisma（型安全） or direct Postgres client via Supabase

- **ストレージ**: Supabase Storage（添付ファイル / エクスポート保存）
- **CI/CD**: GitHub + Vercel 自動デプロイ
- **分析・監視**: Vercel Analytics, Sentry

---

## 7. データ設計（個人開発でも扱いやすい構成）（簡易）
- **projects**: id, name, owner_id, visibility, created_at, updated_at
- **nodes**: id, project_id, parent_id (nullable), title, notes, est_hours, assignee_id, order_index, metadata(json)
- **tasks**: id, node_id, project_id, start_date, end_date, duration_hours, status
- **dependencies**: id, from_task_id, to_task_id, type
- **users**: id, name, email, avatar

※ マインドマップは `nodes` をベースに保持。ガントは `tasks` テーブルでスナップショット化（変換・編集が可能）。

---

## 8. API 設計（抜粋）
- `POST /api/projects` - プロジェクト作成
- `GET /api/projects/:id` - 読込（nodes と tasks を含む）
- `PUT /api/projects/:id` - 更新
- `POST /api/projects/:id/convert` - マインドマップ→ガント変換（サーバー側で整合）
- `POST /api/projects/:id/export` - CSV/PDF/PNG 生成（非同期ジョブにする可能性）

---

## 9. UI/UXワイヤー（要点）
1. **ダッシュボード**: 最近のプロジェクト、テンプレート、インポート
2. **エディタ画面（分割ビュー）**: 左パネル：マインドマップ／右パネル：即時生成されるガント（双方向更新）
3. **プロパティパネル**: 選択ノードの属性編集（担当者、工数、日付）
4. **変換設定モーダル**: 親子ルール、デフォルト工数、依存関係ルールを指定
5. **共有モーダル**: リンク発行、権限設定

---

## 10. 開発スケジュール（個人開発向け）
**開発期間目安: 6〜10週間**（平日夜＋週末で無理なく進めるペース）

- **Week 0**: プロジェクト初期設定（Vercel・Supabase・リポジトリ構成）
- **Week 1**: マインドマップUIの導入（react-flow）
- **Week 2**: ノードCRUDとプロパティ編集の実装
- **Week 3**: Supabase連携（認証・DB保存）
- **Week 4**: マインドマップ→ガント変換の最初のバージョン実装
- **Week 5**: ガントチャート表示・編集（gantt-task-react）
- **Week 6**: エクスポート（CSV程度）と共有リンク
- **Week 7以降（余力）**: UI改善、PDF/PNG出力、バグ修正

---

## 11. 開発体制・コスト（個人開発向けに再構成）
- **開発体制**: 個人開発を前提（フルスタックで一人で対応）
- **開発ペース**: 1日1〜3時間、週10〜15時間程度を想定
- **MVP開発期間**: 約6〜10週間（個人で無理なく進める想定）
- **ランニングコスト**:
  - Vercel: Hobbyプランで無料運用可能（必要に応じてProへ）
  - Supabase: Freeプランで開始可能
- 外部ライブラリ: 全てOSSのため追加コストなし

---

## 12. リスクと対策（個人開発視点）
- **大量ノードでのUI遅延**: 仮想化・レイアウトアルゴリズム（dagre）で対応
- **依存関係の曖昧さ**: デフォルトルールの提示とユーザーによる手動編集を両立
- **リアルタイム共同編集が必要になった場合の負荷**: 初期は非同期共有→後でWebSocket/CRDTで対応

---

## 13. 拡張案（フェーズ2以降）
- リアルタイム共同編集（WebSocket or Supabase Realtime）
- 高度なリソース割当と負荷可視化（ヒートマップ）
- テンプレートマーケット（業界別WBSテンプレ）
- MS Project / Jira 連携
- モバイル最適化（React Native or PWA）

---

## 14. 次のアクション（48時間以内にできること）
1. 技術スタック最終決定（Supabase vs Firebase vs self-managed Postgres）
2. リポジトリ作成・Vercel連携・CIテンプレート追加
3. プロトタイプ（Week1 のマインドマップ画面）を作成して社内でフィードバック

---

### 付録：ライブラリ候補（短評）
- **react-flow**: カスタムノードが作りやすくマインドマップ用途に最適
- **gantt-task-react**: React向けで編集機能が揃っているためMVP向け
- **frappe-gantt**: 軽量でシンプル、拡張時に有用
- **Supabase**: Auth + Postgres + Storage が揃いセットアップが早い
- **Prisma**: 型安全なDB操作（Supabaseと組み合わせも可）


---

以上が、Vercel前提で開発速度を重視した「マインドマップからWBSを作り実用ガントに落とすWebアプリ」の企画書（MVP向け）です。

「これを元に機能優先度のKPTを作ってほしい」「見積りを詳細化してほしい」「アーキテクチャ図を描いてほしい」など、次に進めたい項目を教えてください。

