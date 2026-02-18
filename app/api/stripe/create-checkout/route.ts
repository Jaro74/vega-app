import { createCheckout } from "@/libs/stripe";
import { createClient } from "@/libs/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Esta funcion se usa para crear una Sesion de Checkout de Stripe (pago unico o suscripcion)
// Es llamada por el componente <ButtonCheckout />
// Los usuarios deben estar autenticados. Prerellenara los datos del Checkout con su email y/o tarjeta de credito (si tiene)
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.priceId) {
    return NextResponse.json(
      { error: "Se requiere el ID del precio" },
      { status: 400 }
    );
  } else if (!body.successUrl || !body.cancelUrl) {
    return NextResponse.json(
      { error: "Se requieren las URLs de exito y cancelacion" },
      { status: 400 }
    );
  } else if (!body.mode) {
    return NextResponse.json(
      {
        error:
          "Se requiere el modo (ya sea 'payment' para pagos unicos o 'subscription' para suscripcion recurrente)",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { priceId, mode, successUrl, cancelUrl } = body;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    const stripeSessionURL = await createCheckout({
      priceId,
      mode,
      successUrl,
      cancelUrl,
      // Si el usuario esta logueado, pasara el ID del usuario a la Sesion de Stripe para que pueda ser recuperado en el webhook despues
      clientReferenceId: user?.id,
      user: {
        email: data?.email,
        // Si el usuario ya ha comprado, prerellenara automaticamente su tarjeta de credito
        customerId: data?.customer_id,
      },
      // Si envias cupones desde el frontend, puedes pasarlos aqui
      // couponId: body.couponId,
    });

    return NextResponse.json({ url: stripeSessionURL });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
