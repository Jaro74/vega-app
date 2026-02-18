import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";

// Este es un componente del lado del servidor para asegurar que el usuario esté logueado.
// Si no lo está, redirigirá a la página de login.
// Se aplica a todas las subpáginas de /dashboard en /app/dashboard/*** pages
// También puedes agregar elementos de UI estáticos personalizados como Navbar, Sidebar, Footer, etc.
export default async function LayoutPrivate({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  return <>{children}</>;
}
