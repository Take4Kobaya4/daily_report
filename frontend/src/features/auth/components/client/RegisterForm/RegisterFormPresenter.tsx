import Link from "next/link";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import {
  PASSWORD_MIN_LENGTH,
  type RegisterInput,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/features/auth/schemas/authSchema";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type Props = {
  register: UseFormRegister<RegisterInput>;
  errors: FieldErrors<RegisterInput>;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

export function RegisterFormPresenter({
  register,
  errors,
  isSubmitting,
  errorMessage,
  onSubmit,
}: Props) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1>ユーザー登録</h1>
        </CardTitle>
        <CardDescription>
          ログインID・メールアドレス・パスワードを入力してください
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="space-y-4">
          {errorMessage && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">ログインID</Label>
            <Input
              id="username"
              autoComplete="username"
              aria-invalid={errors.username ? true : undefined}
              aria-describedby={
                errors.username ? "username-error" : "username-hint"
              }
              {...register("username")}
            />
            {errors.username ? (
              <p id="username-error" className="text-sm text-destructive">
                {errors.username.message}
              </p>
            ) : (
              <p id="username-hint" className="text-sm text-muted-foreground">
                {USERNAME_MIN_LENGTH}〜{USERNAME_MAX_LENGTH}
                文字の半角英数字・_・.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? "password-error" : "password-hint"
              }
              {...register("password")}
            />
            {errors.password ? (
              <p id="password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            ) : (
              <p id="password-hint" className="text-sm text-muted-foreground">
                {PASSWORD_MIN_LENGTH}文字以上
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "登録中..." : "登録する"}
          </Button>
          <p className="text-sm text-muted-foreground">
            アカウントをお持ちの方は{" "}
            <Link href="/login" className="underline underline-offset-4">
              ログイン
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
