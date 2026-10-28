import type { Metadata } from "next";
import { Suspense } from "react";
import { Wordmark } from "@/components/site/wordmark";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage(props: PageProps<"/admin/login">) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg-subtle px-4 py-12">
      <div className="w-full max-w-sm">
        <Wordmark />
        <h1 className="mt-8 text-[1.75rem] leading-tight font-[650] tracking-[-0.03em]">Founder sign in</h1>
        <p className="mt-2 text-ink-2">For the four admins only. Students don&apos;t need an account to book.</p>
        <Suspense fallback={null}>
          <NotAdminNotice searchParams={props.searchParams} />
        </Suspense>
        <LoginForm />
      </div>
    </main>
  );
}

async function NotAdminNotice({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const { error } = await searchParams;
  if (error !== "not-admin") return null;
  return (
    <p className="mt-6 bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
      That account isn&apos;t linked to a founder. Check that the tutor email in Supabase matches the login email.
    </p>
  );
}
