import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";

export const dynamic = "force-dynamic";

// Esta ruta se llama después de un login exitoso. Intercambia el código por una sesión y redirige a la URL de callback (ver config.js).
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // URL a la que redirigir después de completar el proceso de inicio de sesión
  return NextResponse.redirect(requestUrl.origin + config.auth.callbackUrl);
}
