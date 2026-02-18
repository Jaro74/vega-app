import Stripe from "stripe";

interface CreateCheckoutParams {
  priceId: string;
  mode: "payment" | "subscription";
  successUrl: string;
  cancelUrl: string;
  couponId?: string | null;
  clientReferenceId?: string;
  user?: {
    customerId?: string;
    email?: string;
  };
}

interface CreateCustomerPortalParams {
  customerId: string;
  returnUrl: string;
}

// Se usa para crear un Checkout de Stripe para pagos unicos. Normalmente se activa con el componente <ButtonCheckout />. Los webhooks se usan para actualizar el estado del usuario en la base de datos.
export const createCheckout = async ({
  user,
  mode,
  clientReferenceId,
  successUrl,
  cancelUrl,
  priceId,
  couponId,
}: CreateCheckoutParams): Promise<string> => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-08-16", // TODO: actualizar cuando Stripe actualice su API
      typescript: true,
    });

    const extraParams: {
      customer?: string;
      customer_creation?: "always";
      customer_email?: string;
      invoice_creation?: { enabled: boolean };
      payment_intent_data?: { setup_future_usage: "on_session" };
      tax_id_collection?: { enabled: boolean };
    } = {};

    if (user?.customerId) {
      extraParams.customer = user.customerId;
    } else {
      if (mode === "payment") {
        extraParams.customer_creation = "always";
        // La opcion de abajo cuesta 0.4% (hasta $2) por factura. Alternativamente, puedes usar https://zenvoice.io/ para crear facturas ilimitadas automaticamente.
        // extraParams.invoice_creation = { enabled: true };
        extraParams.payment_intent_data = { setup_future_usage: "on_session" };
      }
      if (user?.email) {
        extraParams.customer_email = user.email;
      }
      extraParams.tax_id_collection = { enabled: true };
    }

    const stripeSession = await stripe.checkout.sessions.create({
      mode,
      allow_promotion_codes: true,
      client_reference_id: clientReferenceId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      discounts: couponId
        ? [
            {
              coupon: couponId,
            },
          ]
        : [],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...extraParams,
    });

    return stripeSession.url;
  } catch (e) {
    console.error(e);
    return null;
  }
};

// Se usa para crear sesiones del Portal de Cliente, para que los usuarios puedan gestionar sus suscripciones (metodos de pago, cancelar, etc.)
export const createCustomerPortal = async ({
  customerId,
  returnUrl,
}: CreateCustomerPortalParams): Promise<string> => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-08-16", // TODO: actualizar cuando Stripe actualice su API
    typescript: true,
  });

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return portalSession.url;
};

// Se usa para obtener la sesion de checkout del usuario y poblar los datos para obtener el planId al que el usuario se suscribio
export const findCheckoutSession = async (sessionId: string) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-08-16", // TODO: actualizar cuando Stripe actualice su API
      typescript: true,
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    return session;
  } catch (e) {
    console.error(e);
    return null;
  }
};
