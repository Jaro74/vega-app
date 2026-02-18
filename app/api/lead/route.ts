import { NextResponse, NextRequest } from "next/server";
// import { createClient } from "@/libs/supabase/server";

// Esta ruta se usa para almacenar los leads que se generan desde la landing page.
// La llamada a la API es iniciada por el componente <ButtonLead />
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.email) {
    return NextResponse.json({ error: "El email es requerido" }, { status: 400 });
  }

  try {
    // Aquí puedes agregar tu propia lógica
    // Por ejemplo, enviar un email de bienvenida (usa la función helper sendEmail de /libs/resend)
    // Por ejemplo, guardar el lead en la base de datos (descomenta el código de abajo)

    // const supabase = createClient();
    // await supabase.from("leads").insert({ email: body.email });

    return NextResponse.json({});
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
