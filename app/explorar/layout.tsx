import type { ReactNode } from "react";
import type { Metadata } from "next";

// /explorar no puede exportar metadata desde su propio page.tsx porque es
// un Client Component ("use client") -- mismo patron ya usado en
// app/signin/layout.tsx. noindex/nofollow mientras el trafico real del
// experimento este suspendido (libs/experiment/constants.ts,
// EXPERIMENT_ACCEPTING_REAL_TRAFFIC) y no exista responsable del
// tratamiento identificado -- se retira cuando se reactive el trafico real.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
