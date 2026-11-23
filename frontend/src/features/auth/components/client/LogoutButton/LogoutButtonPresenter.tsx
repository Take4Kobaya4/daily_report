import { Button } from "@/shared/components/ui/button";

type Props = {
  isPending: boolean;
  errorMessage?: string;
  onLogout: () => void;
};

export function LogoutButtonPresenter({
  isPending,
  errorMessage,
  onLogout,
}: Props) {
  return (
    <div className="flex items-center gap-3">
      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={onLogout}
      >
        {isPending ? "ログアウト中..." : "ログアウト"}
      </Button>
    </div>
  );
}
