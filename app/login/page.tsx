import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { LoginForm } from "@/app/login/LoginForm";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.mfaVerified) {
    redirect("/admin/dashboard");
  }

  return (
    <main className="min-vh-100 bg-light d-flex align-items-center justify-content-center p-3">
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div className="text-center mb-4">
          <Image
            src="/tda-logo-transparent.png"
            alt="PT. Transformasi Digital Abadi"
            className="login-tda-logo"
            width={200}
            height={75}
            priority
          />
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
