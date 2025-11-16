次のアクションにある **「CIテンプレート追加」** とは、
**GitHub Actions で自動ビルド・自動テスト（必要なら）を行う最低限の設定ファイルをリポジトリに追加すること** を意味します。

個人開発でも、自動で lint / build を実行してくれるだけでかなり安心感が増します。
以下に「何をすれば良いか」を **具体的に** 説明します。

---

# ✅ 何をすればいいか（結論）

GitHub リポジトリに以下のファイルを追加すれば OK です。

```
.github/workflows/ci.yml
```

中には **push や PR の度に Next.js プロジェクトがビルドできるか確認するだけの最小構成** を入れます。

---

# ✅ 最小構成の CI テンプレート（これだけで十分）

以下をそのままリポジトリに入れて OK。

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm install

      - name: Lint
        run: npm run lint --if-present

      - name: Build
        run: npm run build
```

---

# 🔍 CIテンプレート追加で得られるメリット

### ✔ 自動でビルドが通るかチェック

本番リリース前に「ビルドできない状態で Vercel にデプロイされる」事故を防ぐ。

### ✔ PR 時に壊れていないか確認

main ブランチが綺麗に保てる。

### ✔ Vercel のビルド失敗の原因が先にわかる

GitHub Actions のログの方がわかりやすい。

---

# 📌 “CIテンプレート追加” が完了したかチェックするポイント

以下が満たされれば OK：

* [ ] `.github/workflows/ci.yml` が存在する
* [ ] GitHub の “Actions” タブに実行履歴が出ている
* [ ] push / PR 時に自動で lint / build が走る
* [ ] 失敗した場合 GitHub 上で赤く表示される

---

必要なら：

📌 **Supabase の型生成を CI に組み込む方法**
📌 **Vitest / Jest を組み込んだテストCI**
📌 **Lint 固定ルールの追加**

などの発展版も作れます。

次は CI テンプレートを企画書に反映しましょうか？
