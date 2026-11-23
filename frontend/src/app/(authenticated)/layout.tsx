import Link from "next/link";
import { LogoutButton } from "@/features/auth/components/client/LogoutButton";

// セッションの検証は Suspense 境界の内側（各 PageTemplate）で行うため、ここでは読み取らない
export default function AuthenticatedLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between p-4">
          <Link href="/reports" className="font-semibold">
            Daily Report
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
    </>
  );
}
