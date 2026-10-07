import type { ReactNode } from "react";
import type { Metadata } from "next";

// Mismo motivo y mismo patron que app/explorar/layout.tsx.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
