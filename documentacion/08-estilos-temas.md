# 08 - Estilos y Temas

Sistema de estilos basado en Tailwind CSS v4 y DaisyUI v5.

---

## Stack de Estilos

| Tecnologia | Version | Funcion |
|------------|---------|---------|
| Tailwind CSS | 4.1.10 | Framework CSS utility-first |
| DaisyUI | 5.0.5 | Componentes UI con temas |
| @headlessui/react | 2.2.0 | Componentes accesibles (Dialog, Popover) |

---

## Configuracion

### Tailwind v4 (CSS-first)

Tailwind v4 se configura directamente en CSS, no en un archivo `.config.js`. La configuracion esta en `app/globals.css`:

```css
@import "tailwindcss";
```

### DaisyUI v5

DaisyUI se configura como plugin en el mismo `globals.css`:

```css
@plugin "daisyui" {
  themes: light --default,
    --saveit {
      primary: #10B981;
      primary-content: #ffffff;
      secondary: #059669;
      /* ... */
    };
}
```

### PostCSS

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

---

## Temas

### Tema Activo

El tema se configura en `config.ts`:

```typescript
colors: {
  theme: "light",       // Nombre del tema DaisyUI
  main: "#3b82f6",      // Color para barra del navegador
},
```

Se aplica en `app/layout.tsx`:

```html
<html data-theme={config.colors.theme}>
```

### Temas DaisyUI Disponibles

```
light, dark, cupcake, bumblebee, emerald, corporate,
synthwave, retro, cyberpunk, valentine, halloween, garden,
forest, aqua, lofi, pastel, fantasy, wireframe, black,
luxury, dracula
```

### Tema Personalizado: saveit

La plantilla incluye un tema personalizado llamado `saveit`:

| Variable | Color | Uso |
|----------|-------|-----|
| `primary` | #10B981 | Color principal (verde) |
| `primary-content` | #ffffff | Texto sobre primary |
| `secondary` | #059669 | Color secundario |
| `accent` | #34D399 | Color de acento |
| `neutral` | #111827 | Color neutro (oscuro) |
| `base-100` | #ffffff | Fondo principal |
| `base-200` | #F9FAFB | Fondo secundario |
| `base-300` | #E5E7EB | Fondo terciario |
| `base-content` | #111827 | Texto principal |
| `info` | #3B82F6 | Informacion (azul) |
| `success` | #10B981 | Exito (verde) |
| `warning` | #F59E0B | Advertencia (amarillo) |
| `error` | #EF4444 | Error (rojo) |

### Crear Tu Propio Tema

Agrega un nuevo bloque en `globals.css`:

```css
@plugin "daisyui" {
  themes: light --default,
    --mi-tema {
      primary: #6366f1;
      primary-content: #ffffff;
      secondary: #8b5cf6;
      secondary-content: #ffffff;
      accent: #a78bfa;
      accent-content: #ffffff;
      neutral: #1f2937;
      neutral-content: #ffffff;
      base-100: #ffffff;
      base-200: #f3f4f6;
      base-300: #d1d5db;
      base-content: #1f2937;
      info: #3b82f6;
      success: #22c55e;
      warning: #f59e0b;
      error: #ef4444;
    };
}
```

Luego actualiza `config.ts`:

```typescript
colors: {
  theme: "mi-tema",
  main: "#6366f1",
},
```

---

## Animaciones

Definidas en `globals.css` dentro del bloque `@theme`:

### shimmer

Efecto de brillo animado. Usado en `.btn-gradient`.

```css
@keyframes shimmer {
  0% { background-position: 0 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

**Uso:** `animate-shimmer` o 3 segundos ease-out infinite.

### opacity

Transicion suave de opacidad.

```css
@keyframes opacity {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

**Uso:** `animate-opacity` o 0.25 segundos ease-in-out.

### appearFromRight

Elemento aparece deslizandose desde la derecha.

```css
@keyframes appearFromRight {
  0% { opacity: 0.3; transform: translate(15%, 0px); }
  100% { opacity: 1; transform: translate(0); }
}
```

**Uso:** `animate-appearFromRight` o 300ms ease-in-out.

### wiggle

Movimiento de temblor/sacudida.

```css
@keyframes wiggle {
  0%, 20%, 80%, 100% { transform: rotate(0deg); }
  30%, 60% { transform: rotate(-2deg); }
  40%, 70% { transform: rotate(2deg); }
  45% { transform: rotate(-4deg); }
  55% { transform: rotate(4deg); }
}
```

**Uso:** `animate-wiggle` o 1.5 segundos ease-in-out infinite.

### popup

Efecto de aparicion con escala.

```css
@keyframes popup {
  0% { transform: scale(0.8); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
```

**Uso:** `animate-popup` o 0.25 segundos ease-in-out.

---

## Clase Especial: btn-gradient

Boton con gradiente arcoiris animado. Definido en `globals.css`:

```css
.btn-gradient {
  background: linear-gradient(60deg,
    #f79533, #f37055, #ef4e7b, #a166ab,
    #5073b8, #1098ad, #07b39b, #6fba82
  ) !important;
  background-size: 300% 300% !important;
  animation: var(--animate-shimmer) !important;
  color: white !important;
}
```

**Uso:**
```jsx
<button className="btn btn-gradient">Boton AI</button>
```

O con el componente `ButtonGradient`.

---

## Fuente

La plantilla usa **Inter** de Google Fonts, cargada via `next/font/google`:

```typescript
// app/layout.tsx
import { Inter } from "next/font/google";
const font = Inter({ subsets: ["latin"] });
```

Tambien hay una fuente de display definida (Satoshi):

```css
@theme {
  --font-display: "Satoshi", "sans-serif";
}
```

---

## Estilos Globales

```css
html, body {
  scroll-behavior: smooth !important;
}

progress::-webkit-progress-value {
  transition: 0.6s width ease-out;
}

.btn {
  text-transform: capitalize !important;
}
```

---

## Componentes DaisyUI Usados

La plantilla usa estos componentes de DaisyUI:

| Componente | Clases | Ejemplo |
|------------|--------|---------|
| Button | `btn`, `btn-primary`, `btn-block` | Botones de accion |
| Input | `input`, `input-bordered` | Campos de formulario |
| Divider | `divider` | Separador con texto |
| Loading | `loading`, `loading-spinner` | Indicador de carga |
| Badge | `badge` | Etiquetas |
| Card | `card` | Contenedores |
| Dropdown | `dropdown` | Menus desplegables |
| Tooltip | Via react-tooltip | Tooltips informativos |

---

## Imagenes Remotas

Configuradas en `next.config.js`:

```javascript
images: {
  remotePatterns: [
    { hostname: "lh3.googleusercontent.com" },  // Avatares Google
    { hostname: "pbs.twimg.com" },                // Avatares Twitter
    { hostname: "images.unsplash.com" },          // Imagenes stock
    { hostname: "logos-world.net" },              // Logos de marcas
  ],
},
```

Para agregar mas dominios de imagenes, anade entradas aqui.
