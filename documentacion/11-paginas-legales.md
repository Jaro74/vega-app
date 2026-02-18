# 11 - Paginas Legales

La plantilla incluye dos paginas legales listas para personalizar: Politica de Privacidad y Terminos de Servicio.

---

## Archivos

| Pagina | Ruta | Archivo |
|--------|------|---------|
| Politica de Privacidad | `/privacy-policy` | `app/privacy-policy/page.tsx` |
| Terminos de Servicio | `/tos` | `app/tos/page.tsx` |

Ambas paginas:
- Incluyen SEO tags con URL canonica
- Tienen boton "Back" para volver a la landing
- Usan `config.appName` para el titulo
- Estan enlazadas desde el Footer

---

## Como Personalizar

### Paso 1: Editar el Contenido

El texto legal esta dentro de un bloque `{``...``}` en una etiqueta `<pre>`. Reemplaza el contenido con el tuyo.

**Opcion A: Escribirlo tu mismo**

Edita directamente el texto dentro del componente.

**Opcion B: Generarlo con IA**

Cada archivo incluye un prompt comentado al inicio que puedes copiar y pegar en ChatGPT o Claude para generar el texto. Solo necesitas reemplazar los datos del prompt con los tuyos.

### Prompt para Politica de Privacidad

Copia esto, reemplaza los datos y pegalo en una IA:

```
Eres un excelente abogado.

Necesito tu ayuda para redactar una politica de privacidad sencilla para mi sitio web. Aqui tienes el contexto:
- Sitio web: https://TU_DOMINIO.com
- Nombre: TU_APP
- Descripcion: DESCRIPCION_DE_TU_APP
- Datos de usuario recopilados: nombre, correo electronico e informacion de pago
- Recopilacion de datos no personales: cookies web
- Finalidad de la recopilacion de datos: procesamiento de pedidos y prestacion del servicio
- Comparticion de datos: no compartimos los datos con terceros
- Privacidad de los ninos: no recopilamos datos de menores de edad
- Actualizaciones de la politica de privacidad: los usuarios seran notificados por correo electronico
- Informacion de contacto: TU_EMAIL

Por favor, redacta una politica de privacidad sencilla para mi sitio. Anade la fecha actual. No anadas ni expliques tu razonamiento. Respuesta:
```

### Prompt para Terminos de Servicio

```
Eres un excelente abogado.

Necesito tu ayuda para redactar unos Terminos de Servicio sencillos para mi sitio web. Aqui tienes el contexto:
- Sitio web: https://TU_DOMINIO.com
- Nombre: TU_APP
- Informacion de contacto: TU_EMAIL
- Descripcion: DESCRIPCION_DE_TU_APP
- Propiedad: cuando compran un plan, los usuarios obtienen acceso al servicio. Pueden solicitar un reembolso completo dentro de los 7 dias posteriores a la compra.
- Datos de usuario recopilados: nombre, correo electronico e informacion de pago
- Recopilacion de datos no personales: cookies web
- Enlace a politica de privacidad: https://TU_DOMINIO.com/privacy-policy
- Legislacion aplicable: Espana
- Actualizaciones de los terminos: los usuarios seran notificados por correo electronico

Por favor, redacta unos Terminos de Servicio sencillos para mi sitio. Anade la fecha actual. No anadas ni expliques tu razonamiento. Respuesta:
```

---

## Paso 2: Actualizar los Datos

Despues de generar el texto, asegurate de:

1. **Reemplazar el contenido** del `<pre>` con el texto generado
2. **Verificar que `config.appName`** esta correcto en `config.ts`
3. **Revisar los enlaces** dentro del texto (email de contacto, URL de privacy policy, etc.)
4. **Actualizar la fecha** de vigencia

---

## Estructura del Componente

Ambas paginas siguen la misma estructura:

```tsx
import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: "/privacy-policy",
});

const PrivacyPolicy = () => {
  return (
    <main className="max-w-xl mx-auto">
      <div className="p-5">
        <Link href="/" className="btn btn-ghost">
          {/* Icono de flecha */}
          Back
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">
          Privacy Policy for {config.appName}
        </h1>
        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Tu texto legal aqui...`}
        </pre>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
```

---

## Donde Se Enlazan

Las paginas legales se enlazan desde el **Footer** del sitio. Verifica que los enlaces esten presentes:

```jsx
<Link href="/privacy-policy">Politica de Privacidad</Link>
<Link href="/tos">Terminos de Servicio</Link>
```

---

## Consideraciones

- **No son asesoramiento legal.** El texto generado por IA es un punto de partida. Si tu app maneja datos sensibles o opera en jurisdicciones especificas, consulta con un abogado.
- **RGPD/GDPR**: Si operas en Europa, tu politica debe cumplir con el RGPD. Asegurate de incluir: base legal del tratamiento, derechos del usuario (acceso, rectificacion, supresion), duracion de la conservacion de datos, y datos del responsable del tratamiento.
- **Cookies**: Si usas cookies (la plantilla usa cookies de Supabase para sesiones), declaralo en la politica de privacidad.
- **Stripe**: Stripe procesa datos de pago por ti. Mencionalo como procesador de pagos en tu politica.
- **Supabase**: Supabase almacena datos de usuario. Mencionalo si es relevante para tu jurisdiccion.
