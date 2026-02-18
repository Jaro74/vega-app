import { ConfigProps } from "./types/config";

// DaisyUI v5 ya no exporta temas directamente, usando color de respaldo
const themes = {
  light: {
    primary: "#3b82f6", // blue-500
  }
};

const config = {
  // REQUERIDO
  appName: "IA LAB",
  // REQUERIDO: una breve descripcion de tu app para etiquetas SEO (puede sobrescribirse)
  appDescription:
    "El kit definitivo para lanzar tu idea con IA",
  // REQUERIDO (sin https://, sin barra al final, solo el dominio)
  domainName: "ialab.dev",
  crisp: {
    // ID del sitio web de Crisp. SI NO USAS CRISP: simplemente elimina esto => Luego agrega un email de soporte en este archivo de configuracion (resend.supportEmail) de lo contrario el soporte al cliente no funcionara.
    id: "",
    // Ocultar Crisp por defecto, excepto en la ruta "/". Crisp se activa con <ButtonSupport/>. Si quieres mostrar Crisp en todas las rutas, simplemente elimina esto
    onlyShowOnRoutes: ["/"],
  },
  stripe: {
    // Crea multiples planes en tu panel de Stripe, luego agregalos aqui. Puedes agregar tantos planes como quieras, solo asegurate de agregar el priceId
    plans: [
      {
        // REQUERIDO — usamos esto para encontrar el plan en el webhook (por ejemplo, si quieres actualizar los creditos del usuario segun el plan)
        priceId:
          process.env.NODE_ENV === "development"
            ? "price_1Niyy5AxyNprDp7iZIqEyD2h"
            : "price_456",
        // REQUERIDO - Nombre del plan, mostrado en la pagina de precios
        name: "Starter",
        // Una descripcion amigable del plan, mostrada en la pagina de precios. Tip: explica por que este plan y no otros
        description: "Para empezar",
        // El precio que quieres mostrar, el que se cobrara al usuario en Stripe.
        price: 99,
        // Si tienes un precio ancla (ej. $29) que quieres mostrar tachado, ponlo aqui. De lo contrario, dejalo vacio
        priceAnchor: 149,
        features: [
          {
            name: "Plantilla Next.js 15 completa",
          },
          { name: "Autenticacion con Supabase" },
          { name: "Pagos con Stripe" },
          { name: "Emails con Resend" },
        ],
      },
      {
        priceId:
          process.env.NODE_ENV === "development"
            ? "price_1O5KtcAxyNprDp7iftKnrrpw"
            : "price_456",
        // Este plan se vera diferente en la pagina de precios, estara destacado. Solo puedes tener un plan con isFeatured: true
        isFeatured: true,
        name: "Advanced",
        description: "Todo lo que necesitas",
        price: 149,
        priceAnchor: 299,
        features: [
          {
            name: "Todo del plan Starter",
          },
          { name: "Claude Code + Skills configuradas" },
          { name: "30+ componentes listos" },
          { name: "Documentacion completa" },
          { name: "1 year of updates" },
          { name: "Soporte prioritario" },
        ],
      },
    ],
  },
  aws: {
    // Si usas AWS S3/Cloudfront, pon los valores aqui
    bucket: "bucket-name",
    bucketUrl: `https://bucket-name.s3.amazonaws.com/`,
    cdn: "https://cdn-id.cloudfront.net/",
  },
  resend: {
    // REQUERIDO — Campo 'From' del email que se usara al enviar enlaces de inicio de sesion magico
    fromNoReply: `IA LAB <noreply@resend.ialab.dev>`,
    // REQUERIDO — Campo 'From' del email que se usara al enviar otros correos, como carritos abandonados, actualizaciones, etc.
    fromAdmin: `Nico de IA LAB <nico@resend.ialab.dev>`,
    // Email mostrado al cliente si necesita soporte. Dejalo vacio si no es necesario => si esta vacio, configura Crisp arriba, de lo contrario no podras ofrecer soporte al cliente.
    supportEmail: "nico.cmw@gmail.com",
  },
  colors: {
    // REQUERIDO — El tema de DaisyUI a usar (agregado al layout.js principal). Dejalo en blanco para el predeterminado (modo claro y oscuro). Si usas cualquier otro tema que no sea light/dark, necesitas agregarlo en config.tailwind.js en daisyui.themes.
    theme: "light",
    // REQUERIDO — Este color se reflejara en toda la app fuera del documento (barra de carga, pestanas de Chrome, etc.). Por defecto toma el color primario de tu tema DaisyUI (asegurate de actualizar el nombre del tema despues de "data-theme=")
    // O simplemente puedes hacer esto para usar un color personalizado: main: "#f37055". Solo HEX.
    main: themes["light"]["primary"],
  },
  auth: {
    // REQUERIDO — la ruta para iniciar sesion de usuarios. Se usa para proteger rutas privadas (como /dashboard). Se usa en apiClient (/libs/api.js) ante errores 401 de nuestra API
    loginUrl: "/api/auth/signin",
    // REQUERIDO — la ruta a la que quieres redirigir a los usuarios despues de un inicio de sesion exitoso (ej. /dashboard, /private). Normalmente es una pagina privada para que los usuarios gestionen sus cuentas. Se usa en apiClient (/libs/api.js) ante errores 401 de nuestra API y en ButtonSignin.js
    callbackUrl: "/dashboard",
  },
} as ConfigProps;

export default config;
