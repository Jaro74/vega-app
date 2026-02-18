import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createCustomerPortal } from "@/libs/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await req.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Los usuarios que no están logueados no pueden realizar una compra
    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para ver la información de facturación." },
        { status: 401 }
      );
    } else if (!body.returnUrl) {
      return NextResponse.json(
        { error: "Se requiere la URL de retorno" },
        { status: 400 }
      );
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (!data?.customer_id) {
      return NextResponse.json(
        {
          error: "Aún no tienes una cuenta de facturación. Realiza una compra primero.",
        },
        { status: 400 }
      );
    }

    const stripePortalUrl = await createCustomerPortal({
      customerId: data.customer_id,
      returnUrl: body.returnUrl,
    });

    return NextResponse.json({
      url: stripePortalUrl,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
