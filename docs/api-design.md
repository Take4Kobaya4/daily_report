# API設計

MVPではNext.js Route Handlersを利用してREST APIを実装する。

将来的なGoへの移行を考慮し、API契約を明確にする（[architecture.md](./architecture.md#9-future-go-migration)）。

Route HandlersはHTTPリクエスト・レスポンスの責務に限定し、処理は`external/handler`へ委譲する（業務ロジックは`external/service`）。

---

## 1. Endpoints

### 1.1 日報API

| Method | Path | Description |
|---|---|---|
| POST | /api/reports | 日報作成 |
| GET | /api/reports | 日報一覧 |
| GET | /api/reports/:id | 日報詳細 |
| PATCH | /api/reports/:id | 日報編集 |
| DELETE | /api/reports/:id | 日報削除 |

すべての日報APIは認証必須。

リクエスト・レスポンスの項目は [database-design.md](./database-design.md#2-report) のReportに対応するが、DBモデルをそのまま公開しない。

### 1.2 認証API

認証APIは自前で実装せず、Better Authが`/api/auth/*`に提供するエンドポイントを利用する（`username`プラグイン使用）。

| Method | Path | Description | ユースケース | クライアント呼び出し |
|---|---|---|---|---|
| POST | /api/auth/sign-up/email | ユーザー登録（登録後ログイン状態にする） | UC-01 | `authClient.signUp.email` |
| POST | /api/auth/sign-in/username | ログイン（ログインID + パスワード） | UC-02 | `authClient.signIn.username` |
| POST | /api/auth/sign-out | ログアウト（セッション破棄） | UC-03 | `authClient.signOut` |
| GET | /api/auth/get-session | セッション取得 | — | `authClient.getSession` / `useSession` |

#### リクエスト項目

| エンドポイント | 項目 |
|---|---|
| sign-up/email | `username`（ログインID）、`email`、`password`、`name`（ログインIDと同じ値を設定） |
| sign-in/username | `username`（ログインID）、`password` |

入力ルールは [requirements.md](./requirements.md#認証) を参照。

#### ルール

- メールアドレスでのログイン（`/api/auth/sign-in/email`）は`disabledPaths`で無効化し、ログインはログインID + パスワードのみとする。
- クライアントからは`authClient`経由で呼び出し、`fetch`で直接呼び出さない。
- 認証に成功するとセッションCookieが発行され、日報APIはこのセッションからユーザーIDを取得する。
- サーバー側（Server Component / Route Handler）でのセッション取得はHTTPを経由せず、`auth.api.getSession`を直接呼び出す。
- ログイン失敗時は、ログインIDとパスワードのどちらが誤っているかを区別して表示しない。
- ログアウト後はクライアントのキャッシュを破棄し、ログイン画面へ遷移する。

詳細な実装は [frontend/docs/08_authentication.md](../frontend/docs/08_authentication.md) を参照。

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

上記は日報APIのステータスコードである。認証APIのステータスコード・エラーコードはBetter Authの仕様に従う。

---

## 4. 未決定事項

- エラーレスポンスの具体的なJSON形式
- 日付（`reportDate`）・日時（`createdAt` / `updatedAt`）のシリアライズ形式
- 一覧APIの並び順・ページングの有無
- 認証APIのエラーコード（ログインID重複・認証失敗など）と画面表示メッセージの対応（Better Auth導入時に確認する）
