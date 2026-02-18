# Componentes Disponibles

Documentacion de todos los componentes disponibles en el boilerplate, organizados por categoria.

---

## Estructura y Layout

### Header
Cabecera responsive con logo (izquierda), enlaces (centro) y CTA (derecha). Los enlaces y CTA se ocultan en movil y son accesibles mediante menu hamburguesa.

```jsx
import Header from "@/components/Header";
```

**Tips:**
- A menos que seas Nike o Apple, los visitantes no saben quien eres. Manten el nombre de tu marca pequeno.
- Intenta siempre tener un enlace de Pricing en tu header. Sin importar que vendas, la gente lo buscara.

---

### Footer
Pie de pagina simple con logo, slogan y enlaces.

```jsx
import Footer from "@/components/Footer";
```

---

## Seccion Principal

### Hero
Seccion hero con titulo, subtitulo de apoyo, imagen, prueba social y CTA.

```jsx
import Hero from "@/components/Hero";
```

**Tips:**
- Tu `<h1>` debe responder esta pregunta en menos de 10 palabras: "Por que deberia un visitante aleatorio quedarse en tu sitio mas de 10 segundos?"
- Escribe sobre el dolor que alivia, el problema que resuelve o el placer que proporciona.

---

## Problema y Solucion

### Problem
Explica las consecuencias de no solucionar el problema que tu startup promete resolver. Va debajo de la seccion Hero y arriba de Features.

```jsx
import Problem from "@/components/Problem";
```

**Tips:**
- Tu seccion `<Hero />` debe hacer una promesa al cliente: "Nuestro producto te ayuda a resolver el problema XYZ".

---

### WithWithout
Explica como tu producto es mejor que los competidores. Util si estas en un mercado competitivo y desafias el status quo.

```jsx
import WithWithout from "@/components/WithWithout";
```

**Tips:**
- Haz coincidir cada linea de la columna "Con" con la columna "Sin".

---

## Caracteristicas (Features)

### FeaturesListicle
Lista de caracteristicas con icono, titulo y descripcion. Clic en una caracteristica muestra su descripcion. Se intercambian automaticamente cada 5 segundos (opcional).

```jsx
import FeaturesListicle from "@/components/FeaturesListicle";
```

**Tips:**
- Tu `<h2>` debe recordar a los visitantes el valor de tu producto. Por que lo necesitan?

---

### FeaturesAccordion
Muestra 2 a 5 caracteristicas en acordeon. Por defecto, la primera esta seleccionada. El contenido puede incluir video o imagen con autoplay.

```jsx
import FeaturesAccordion from "@/components/FeaturesAccordion";
```

**Tips:**
- Manten el titulo corto y simple (menos de 5 palabras).

---

### FeaturesGrid
Caracteristicas con demos interactivos en layout de grid responsive. Cada feature tiene titulo, descripcion corta y demo interactivo.

```jsx
import FeaturesGrid from "@/components/FeaturesGrid";
```

**Tips:**
- Manten el titulo corto y simple (menos de 5 palabras).

---

## Conversion

### CTA
Seccion CTA de pantalla completa con titulo, subtitulo de apoyo, imagen de fondo y CTA.

```jsx
import CTA from "@/components/CTA";
```

**Tips:**
- El titular debe destacar el valor que tu producto/servicio proporciona. Por que deberia registrarse un usuario aleatorio? Que dolor estas aliviando?

---

### Pricing
Seccion de precios con capacidad de destacar un plan. Agrega un plan a tu `config.js` para mostrar mas.

```jsx
import Pricing from "@/components/Pricing";
```

**Tips:**
- "Bueno, Mejor, El Mejor" es una buena estrategia de precios.

---

## Preguntas Frecuentes

### FAQ
Lista de preguntas/respuestas para las consultas mas comunes.

```jsx
import FAQ from "@/components/FAQ";
```

**Tips:**
- Intenta cubrir posibles objeciones que tus visitantes puedan tener. Por ejemplo, si vendes un curso, agrega una pregunta sobre la politica de reembolso.

---

## Testimonios

### Testimonial1Small
Testimonio pequeno, bonito y detallado para mostrar amor de tus clientes.

```jsx
import Testimonial1Small from "@/components/Testimonial1Small";
```

---

### Testimonials1
Testimonio unico, bonito y detallado.

```jsx
import Testimonials1 from "@/components/Testimonials1";
```

---

### Testimonials3
3 testimonios simples para mostrar amor de tus clientes.

```jsx
import Testimonials3 from "@/components/Testimonials3";
```

---

### Testimonials11
11 testimonios simples con soporte para videos para construir aun mas confianza.

```jsx
import Testimonials11 from "@/components/Testimonials11";
```

---

### TestimonialsAvatars
Muestra 5 fotos de clientes con un rating.

```jsx
import TestimonialsAvatars from "@/components/TestimonialsAvatars";
```

**Tip para todos los testimonios:**
- No preguntes a los usuarios si les gusta tu producto. En su lugar, pregunta como cambio sus vidas despues de usarlo.

---

## Botones

### ButtonLead
Captura emails y los guarda automaticamente en la base de datos. Perfecto para waitlist o popup de generacion de leads.

```jsx
import ButtonLead from "@/components/ButtonLead";
```

**Requisito:** Requiere base de datos. Usa la ruta API `/api/lead/route.js`.

---

### ButtonCheckout
Abre una sesion de Stripe Checkout. Perfecto para pagos unicos o suscripciones.

```jsx
import ButtonCheckout from "@/components/ButtonCheckout";
```

**Configuracion:**
- `mode="payment"` para pagos unicos
- `mode="subscription"` para pagos recurrentes

**Nota:** Por defecto, el usuario debe estar logueado para hacer checkout (previene disputas fraudulentas).

---

### ButtonSignin
Boton simple para iniciar sesion/registrarse con proveedores (Google y Magic Links).

```jsx
import ButtonSignin from "@/components/ButtonSignin";
```

**Comportamiento:**
- Redirige automaticamente a `callbackUrl` despues del login
- Si ya esta logueado, muestra su foto de perfil y redirige inmediatamente

---

### ButtonAccount
Menu dropdown para gestionar cuenta de usuario.

```jsx
import ButtonAccount from "@/components/ButtonAccount";
```

**Opciones incluidas:**
- **Billing:** Abre Stripe Customer Portal para gestionar facturacion
- **Logout:** Cierra sesion y vuelve a la pagina principal

**Nota:** Se oculta automaticamente si el usuario no esta logueado.

---

### ButtonGradient
Boton con fondo de gradiente animado. Perfecto para herramientas de IA.

```jsx
import ButtonGradient from "@/components/ButtonGradient";
```

---

### ButtonPopover
Boton animado que despliega un menu. Usar cuando la interfaz esta muy cargada.

```jsx
import ButtonPopover from "@/components/ButtonPopover";
```

---

## Utilidades UI

### BetterIcon
Mejor forma de mostrar iconos SVG simples.

```jsx
import BetterIcon from "@/components/BetterIcon";
```

---

### Tabs
Forma simple de organizar contenido en secciones separadas.

```jsx
import Tabs from "@/components/Tabs";
```

---

### TestimonialRating
Muestra el rating de tu app. Se ve bien encima de un titular.

```jsx
import TestimonialRating from "@/components/TestimonialRating";
```

---

### Modal
Ventana popup animada para explicaciones, generacion de leads, formularios, etc.

```jsx
import Modal from "@/components/Modal";

export default function Component() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Modal isOpen={isModalOpen} setIsOpen={setIsModalOpen} />
  );
}
```

---

## Resumen Rapido

| Componente | Categoria | Funcion Principal |
|------------|-----------|-------------------|
| Header | Layout | Navegacion principal |
| Footer | Layout | Pie de pagina |
| Hero | Principal | Seccion de bienvenida |
| Problem | Problema | Consecuencias del problema |
| WithWithout | Solucion | Comparacion con competencia |
| FeaturesListicle | Features | Lista de caracteristicas |
| FeaturesAccordion | Features | Acordeon de caracteristicas |
| FeaturesGrid | Features | Grid con demos |
| CTA | Conversion | Llamada a la accion |
| Pricing | Conversion | Tabla de precios |
| FAQ | Soporte | Preguntas frecuentes |
| Testimonial1Small | Social Proof | Testimonio pequeno |
| Testimonials1 | Social Proof | Testimonio unico |
| Testimonials3 | Social Proof | 3 testimonios |
| Testimonials11 | Social Proof | 11 testimonios + video |
| TestimonialsAvatars | Social Proof | Avatares con rating |
| ButtonLead | Botones | Captura de emails |
| ButtonCheckout | Botones | Pago con Stripe |
| ButtonSignin | Botones | Inicio de sesion |
| ButtonAccount | Botones | Gestion de cuenta |
| ButtonGradient | Botones | Boton decorativo |
| ButtonPopover | Botones | Menu desplegable |
| BetterIcon | UI | Iconos SVG |
| Tabs | UI | Contenido en pestanas |
| TestimonialRating | UI | Rating visual |
| Modal | UI | Ventana emergente |