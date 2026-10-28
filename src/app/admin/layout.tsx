import type { Metadata } from "next";
import { Toaster } from "sonner";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { default: "Admin", template: `%s · Admin · ${site.name}` },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            boxShadow: "var(--shadow-float)",
            fontFamily: "var(--font-sans)",
          },
        }}
      />
    </>
  );
}
