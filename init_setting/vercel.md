次のアクションにある **「Vercel連携」** とは、
**GitHub のリポジトリを Vercel に接続し、プッシュ＝自動デプロイが行える状態にすること** を指します。
個人開発においては特に重要な初期設定なので、具体的に何をすれば良いかを以下にまとめます。

---

# ✅ Vercel連携でやること（具体的手順）

## **1. Vercel のアカウント作成（まだなら）**

* GitHub アカウントでログイン可能
  → [https://vercel.com/](https://vercel.com/)

---

## **2. ダッシュボードから「New Project」を選択**

1. Vercel Dashboard にアクセス
2. **“Add New…” → “Project”** をクリック
3. GitHub のリポジトリ一覧が表示されるので、
   **今回作成したプロジェクトのリポジトリを選択**

---

## **3. GitHub アクセス権限の許可**

* 初回は「どのリポジトリを Vercel と連携するか」を聞かれる
* **対象リポジトリのみ許可** でOK（セキュリティ的にも安全）

---

## **4. 環境設定**

### 最低限確認すべきポイント：

#### ✔ Framework Preset: **Next.js**

自動で検出されます。

#### ✔ Root Directory

* 基本は `/`（プロジェクトルート）
* monorepo の場合のみ変更

#### ✔ Build & Output Settings

自動設定でOK

* Build Command: `next build`
* Output Directory: `.next`

---

## **5. 環境変数の設定（必要なら）**

Supabase を使うなら、以下の環境変数を設定：

* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* （Server Action 用に）`SUPABASE_SERVICE_ROLE_KEY`（これは *公開不可* なので `Environment Variables` の `Production`/`Preview` のみ）

※環境変数は後で追加してもOK
→ **Settings → Environment Variables**

---

## **6. デプロイ（Vercel が自動で実行）**

GitHub と接続すると、以下が自動で実行される：

* GitHub → Vercel へソースクローン
* `npm install`
* `next build`
* アプリがホスティングされる

→ 数十秒〜数分で **preview URL** が発行される
→ main/master ブランチは **production URL** にデプロイされる

---

## **7. 今後の開発フロー**

* GitHub に push → Vercel が自動ビルド
* PR を作ると PR 用の preview が生成
* main に merge → 自動で production へデプロイ

**＝ Vercel連携完了！**

---

# 🔧 補足：完了確認チェックリスト

以下が全てできていれば OK：

* [ ] GitHub と Vercel が連携されている
* [ ] GitHub への push で preview が生成される
* [ ] main branch は production にデプロイされる
* [ ] Vercel の Dashboard でログ/ビルド履歴を確認できる
* [ ] 必要な環境変数を登録済み

---

必要であれば、
📌 **Supabase の環境変数設定手順**
📌 **Project Structure（Next.js + Supabase の推奨構成）**
📌 **Vercel の CI/CD 設定の最適化**

なども作成できます。

次に知りたい内容はありますか？
