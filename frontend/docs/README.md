# フロントエンド技術仕様書

このディレクトリには、`frontend/`（Next.js アプリケーション）の実装に関する技術仕様書をまとめています。

要件・ユースケース・API・DB などプロダクト全体の設計は、リポジトリ直下の [`docs/`](../../docs/) を正とします。
本ディレクトリは、それらを **どのようにコードへ落とし込むか** を説明する実装ガイドです。内容が食い違う場合はリポジトリ直下の `docs/` を優先し、本ディレクトリを修正してください。

## ドキュメント一覧

1. **[技術スタック](./01_tech_stack.md)**
   - 使用技術とライブラリ
   - 導入状況（導入済み / 未導入）
   - 開発環境要件

2. **[アーキテクチャ設計](./02_architecture.md)**
   - 全体構成とレイヤーの責務
   - データフロー（読み取り / 書き込み）
   - 依存関係のルール

3. **[App Router設計ガイド](./03_app_router.md)**
   - ルートグループとルーティング一覧
   - ページコンポーネントパターン
   - Loading / Error / Not Found

4. **[Featuresディレクトリ設計](./04_features_structure.md)**
   - ページ群専用のものをまとめる（1 コンポーネント 1 ディレクトリ）
   - features と shared の使い分け
   - Container / Presenter パターン
   - 命名規則

5. **[External Layer設計](./05_external_layer.md)**
   - 外部連携層（client / domain / dto / handler / repository / service）の責務
   - Route Handler からの呼び出し
   - Go 移行時は service だけを変更する設計

6. **[TanStack Query実装ガイド](./06_tanstack_query.md)**
   - Provider とクエリキー
   - サーバーサイドプリフェッチ
   - Query / Mutation

7. **[フォーム・バリデーション](./07_form_validation.md)**
   - Zod スキーマの共有
   - React Hook Form による共通フォーム
   - Markdown 入力・プレビュー

8. **[認証・認可](./08_authentication.md)**
   - Better Auth の構成
   - 認証ガード
   - 所有者チェック

9. **[開発ガイド](./09_development_guide.md)**
   - 新規画面追加フロー
   - コーディング規約
   - テスト・品質チェック

## クイックスタート

新しい機能を実装する場合は、以下の順序でドキュメントを参照してください。

1. 要件・ユースケースを確認する → [../../docs/requirements.md](../../docs/requirements.md) / [../../docs/use-cases.md](../../docs/use-cases.md)
2. アーキテクチャを理解する → [02_architecture.md](./02_architecture.md)
3. 実装場所を決める → [04_features_structure.md](./04_features_structure.md)
4. API・DB を実装する → [05_external_layer.md](./05_external_layer.md)
5. 画面を実装する → [06_tanstack_query.md](./06_tanstack_query.md) / [07_form_validation.md](./07_form_validation.md)
6. 開発ガイドに沿って仕上げる → [09_development_guide.md](./09_development_guide.md)

AI エージェント向けの作業ルールは [../AGENTS.md](../AGENTS.md) を参照してください。
