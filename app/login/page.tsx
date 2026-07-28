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
    <main className="flex min-h-screen items-center justify-center bg-background p-3">
      <div className="w-full max-w-[460px]">
        <div className="mb-6 text-center">
          <Image
            src="/tda-logo-transparent.png"
            alt="PT. Transformasi Digital Abadi"
            className="login-tda-logo mx-auto"
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
