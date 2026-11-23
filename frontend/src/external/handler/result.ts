/**
 * handler の結果。HTTP には依存させず値として返し、ステータスへの変換は Route Handler が行う。
 *
 * | 結果                  | HTTP ステータス                     |
 * | --------------------- | ----------------------------------- |
 * | ok: true（作成）      | 201                                 |
 * | ok: true（取得・更新）| 200                                 |
 * | ok: true（削除）      | 204                                 |
 * | VALIDATION_ERROR      | 422                                 |
 * | NOT_FOUND             | 404（他ユーザーの日報も同じ）       |
 */
export type HandlerError = "VALIDATION_ERROR" | "NOT_FOUND";

export type HandlerResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: HandlerError };
