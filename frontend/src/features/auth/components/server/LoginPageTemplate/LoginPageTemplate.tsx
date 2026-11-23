import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/servers/getSession";
import { LoginForm } from "../../client/LoginForm";

export async function LoginPageTemplate() {
  const session = await getSession();
  if (session) redirect("/reports");

  return <LoginForm />;
}
