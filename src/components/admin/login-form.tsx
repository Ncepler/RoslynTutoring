"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/actions";
import { Spinner } from "@/components/icons";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="card mt-8 space-y-4 p-6">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" required className="field" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state?.error && (
        <p className="bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending && <Spinner />}
        Sign in
      </button>
    </form>
  );
}
