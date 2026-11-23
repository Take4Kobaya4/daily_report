import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/servers/getSession";
import { RegisterForm } from "../../client/RegisterForm";

export async function RegisterPageTemplate() {
  const session = await getSession();
  if (session) redirect("/reports");

  return <RegisterForm />;
}
