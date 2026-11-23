import { Suspense } from "react";
import { HomePageTemplate } from "@/features/auth/components/server/HomePageTemplate";

// セッション（Cookie）の読み取りは cacheComponents のため Suspense 境界の内側で行う
export default function Page() {
  return (
    <Suspense>
      <HomePageTemplate />
    </Suspense>
  );
}
