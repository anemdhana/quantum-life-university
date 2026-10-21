import { SitePage } from "@/components/SitePage";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <SitePage>
      <h1>Sign in</h1>
      <p className="muted">Sign in with the email and password assigned to you. Change it later from Account.</p>
      <LoginForm />
    </SitePage>
  );
}
