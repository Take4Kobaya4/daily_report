# データベース設計

DBはPostgreSQLを使用し、Prismaでアクセスする。

---

## 1. Main Tables

| テーブル | 管理 | 概要 |
|---|---|---|
| Better Authの認証関連テーブル（user / session / account / verification など） | Better Auth | ユーザー・セッション・認証情報 |
| Report | 本アプリ | 日報 |

Better Authが管理する認証テーブルを独自実装で置き換えない。

---

## 2. Report

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | 主キー |
| userId | String | 作成者ID（Better Authのuserへの外部キー） |
| title | String | タイトル |
| content | Text | Markdown本文 |
| reportDate | Date | 日報日付 |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

### Constraints

- タイトルは必須、最大200文字
- 本文は必須、最大20,000文字
- 同一日に複数の日報を作成可能（`userId` + `reportDate` にユニーク制約を付けない）
- `userId`は認証済みユーザーから設定
- 日報の日付は時刻を含まない
- 日時は原則UTCで扱う

---

## 3. Database Design Rules

- DBスキーマの変更はマイグレーションで管理する。
- 外部キー制約を適切に設定する。
- 必要なインデックスを設定する。
- N+1クエリを避ける。
- DBアクセスはRepositoryに集約する。
- 業務ルールは原則としてServiceに実装する。
- 不必要なトランザクションは使用しない。
- 必要な複数操作の整合性はトランザクションで保証する。
- DBクエリではユーザーIDによる所有者制限を行う。

---

## 4. 未決定事項

- インデックス：一覧取得（ユーザー単位・日付順）に合わせて `(userId, reportDate)` の複合インデックスを検討する。
- ユーザー削除時の日報の扱い（`onDelete: Cascade` にするか）。
- 一覧の並び順と、ページングの要否。
