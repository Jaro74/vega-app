import configFile from "@/config";
import { findCheckoutSession } from "@/libs/stripe";
import { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
  typescript: true,
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Aqui es donde recibimos los eventos webhook de Stripe
// Se usa para actualizar los datos del usuario, enviar emails, etc.
// Por defecto, almacena al usuario en la base de datos
export async function POST(req: NextRequest) {
  const body = await req.text();

  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  let eventType;
  let event;

  // Crear un cliente de Supabase privado usando la clave API secreta service_role
  const supabase = new SupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verificar que el evento de Stripe sea legitimo
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`La verificacion de firma del webhook fallo. ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  eventType = event.type;

  try {
    switch (eventType) {
      case "checkout.session.completed": {
        // El primer pago fue exitoso y se creo una suscripcion (si el modo estaba configurado como "subscription" en ButtonCheckout)
        // ✅ Conceder acceso al producto
        const stripeObject: Stripe.Checkout.Session = event.data
          .object as Stripe.Checkout.Session;

        const session = await findCheckoutSession(stripeObject.id);

        const customerId = session?.customer;
        const priceId = session?.line_items?.data[0]?.price.id;
        const userId = stripeObject.client_reference_id;
        const plan = configFile.stripe.plans.find((p) => p.priceId === priceId);

        const customer = (await stripe.customers.retrieve(
          customerId as string
        )) as Stripe.Customer;

        if (!plan) break;

        let user;
        if (!userId) {
          // Verificar si el usuario ya existe
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", customer.email)
            .single();
          if (profile) {
            user = profile;
          } else {
            // Crear un nuevo usuario usando supabase auth admin
            const { data } = await supabase.auth.admin.createUser({
              email: customer.email,
            });

            user = data?.user;
          }
        } else {
          // Buscar usuario por ID
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          user = profile;
        }

        await supabase
          .from("profiles")
          .update({
            customer_id: customerId,
            price_id: priceId,
            has_access: true,
          })
          .eq("id", user?.id);

        // Extra: enviar email con enlace del usuario, pagina del producto, etc.
        // try {
        //   await sendEmail(...);
        // } catch (e) {
        //   console.error("Problema con email:" + e?.message);
        // }

        break;
      }

      case "checkout.session.expired": {
        // El usuario no completo la transaccion
        // No necesitas hacer nada aqui, pero puedes enviar un email al usuario para recordarle completar la transaccion, por ejemplo
        break;
      }

      case "customer.subscription.updated": {
        // El cliente podria haber cambiado el plan (plan superior o inferior, cancelar pronto, etc.)
        // No necesitas hacer nada aqui, porque Stripe nos avisara cuando la suscripcion se cancele definitivamente (al final del ciclo de facturacion) en el evento "customer.subscription.deleted"
        // Puedes actualizar los datos del usuario para mostrar una insignia "Se cancelara pronto" por ejemplo
        break;
      }

      case "customer.subscription.deleted": {
        // La suscripcion del cliente se detuvo
        // ❌ Revocar acceso al producto
        const stripeObject: Stripe.Subscription = event.data
          .object as Stripe.Subscription;
        const subscription = await stripe.subscriptions.retrieve(
          stripeObject.id
        );

        await supabase
          .from("profiles")
          .update({ has_access: false })
          .eq("customer_id", subscription.customer);
        break;
      }

      case "invoice.paid": {
        // El cliente acaba de pagar una factura (por ejemplo, un pago recurrente de una suscripcion)
        // ✅ Conceder acceso al producto
        const stripeObject: Stripe.Invoice = event.data
          .object as Stripe.Invoice;
        const priceId = stripeObject.lines.data[0].price.id;
        const customerId = stripeObject.customer;

        // Buscar perfil donde customer_id sea igual a customerId (en la tabla llamada 'profiles')
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("customer_id", customerId)
          .single();

        // Asegurarse de que la factura sea del mismo plan (priceId) al que el usuario se suscribio
        if (profile.price_id !== priceId) break;

        // Conceder al perfil acceso a tu producto. Es un booleano en la base de datos, pero podria ser un numero de creditos, etc.
        await supabase
          .from("profiles")
          .update({ has_access: true })
          .eq("customer_id", customerId);

        break;
      }

      case "invoice.payment_failed":
        // Un pago fallo (por ejemplo, el cliente no tiene un metodo de pago valido)
        // ❌ Revocar acceso al producto
        // ⏳ O esperar a que el cliente pague (mas amigable):
        //      - Stripe enviara automaticamente un email al cliente (Smart Retries)
        //      - Recibiremos un "customer.subscription.deleted" cuando se hayan realizado todos los reintentos y la suscripcion haya expirado

        break;

      default:
      // Tipo de evento no manejado
    }
  } catch (e) {
    console.error("Error de stripe: ", e.message);
  }

  return NextResponse.json({});
}
