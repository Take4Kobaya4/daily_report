# API設計

MVPではNext.js Route Handlersを利用してREST APIを実装する。

将来的なGoへの移行を考慮し、API契約を明確にする（[architecture.md](./architecture.md#9-future-go-migration)）。

Route HandlersはHTTPリクエスト・レスポンスの責務に限定し、業務ロジックはService層へ委譲する。

---

## 1. Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/reports | 日報作成 |
| GET | /api/reports | 日報一覧 |
| GET | /api/reports/:id | 日報詳細 |
| PATCH | /api/reports/:id | 日報編集 |
| DELETE | /api/reports/:id | 日報削除 |

認証APIはBetter Authを利用する（`/api/auth/*`）。

すべての日報APIは認証必須。

リクエスト・レスポンスの項目は [database-design.md](./database-design.md#2-report) のReportに対応するが、DBモデルをそのまま公開しない。

---

## 2. API Rules

- HTTPメソッドを適切に使用する。
- 入力値をZodで検証する。
- クライアントから送信された`userId`を信用しない。
- セッションからユーザーIDを取得する。
- すべての日報操作で所有者チェックを行う。
- APIエラーレスポンスの形式を統一する。
- クライアントにDBモデルをそのまま公開しない。
- 日付・日時のシリアライズ形式を統一する。
- APIの仕様変更時は関連する型・テストも更新する。

---

## 3. Status Codes

| Status | Description |
|---|---|
| 200 | 取得・更新成功 |
| 201 | 作成成功 |
| 204 | 削除成功 |
| 400 | リクエスト形式不正 |
| 401 | 未認証 |
| 404 | データなし・アクセス不可 |
| 422 | 入力値の検証エラー |
| 500 | サーバー内部エラー |

他ユーザーの日報へのアクセスは、存在を秘匿するため403ではなく404を返す。

---

## 4. 未決定事項

- エラーレスポンスの具体的なJSON形式
- 日付（`reportDate`）・日時（`createdAt` / `updatedAt`）のシリアライズ形式
- 一覧APIの並び順・ページングの有無
