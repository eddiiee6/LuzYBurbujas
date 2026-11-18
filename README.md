# Luz y burbujas Lulú 🌸🕯️

Sitio web de velas y jabones artesanales con **personalizador**: el cliente elige el molde, si lo quiere en jabón o en vela, el color, la esencia y la placa de yeso, y ve cómo queda antes de pedirlo por WhatsApp.

## Qué incluye (Fase 1)

| Página | Qué hace |
|---|---|
| `/` Inicio | Portada, cómo funciona, favoritos, esencias y cotización para eventos |
| `/catalogo` | Moldes con filtros por colección (Jardín, Día de Muertos, Invierno) y tipo |
| `/personaliza` | El personalizador estilo videojuego (ver abajo) |
| `/pedido` | Lista del pedido, cantidades, datos del cliente y **Enviar por WhatsApp** |
| `/admin` | Panel para editar moldes, placas, colores, esencias, colecciones y ajustes |

### El personalizador

- El cliente elige **molde → jabón o vela → color → presentación** (sola, placa, cesta, cajita o tarjeta) y la esencia.
- Se muestra la **foto real** de esa combinación (las mismas de Instagram), completa y sin recortar. Si hay varias, se pasan con puntitos.
- Si la combinación aún no tiene foto, aparece **"📷 Foto en preparación"**; se puede pedir igual y el WhatsApp lo indica.
- El color se elige libre: la foto es de referencia y el color pedido va en el mensaje.
- Solo se ofrecen las presentaciones permitidas para el tipo (y donde el molde cabe por medidas).

### Fotos

En `/admin` → **Moldes** → **📷 Fotos reales**: se suben las fotos y en cada una se indica la presentación, si es vela/jabón y (opcional) el color. El editor muestra qué combinaciones ya tienen foto (📷) y cuáles faltan (⏳). La primera foto es la portada del molde.

## Tecnología

| Parte | Elección |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Datos | **Supabase** (Postgres + almacenamiento de fotos + login). Sin Supabase funciona en *modo local* |
| Pedidos | Enlace de WhatsApp con el mensaje ya armado |
| Hosting | Vercel o Netlify (gratis). Ya incluye `vercel.json` y `public/_redirects` |

### Estructura

```
src/
  types.ts              Modelo de datos (molde, placa, color, esencia, colección)
  data/seed.ts          Catálogo inicial (5 moldes, 3 placas, 7 esencias, 10 colores)
  data/repo.ts          Capa de datos: modo local (navegador) o Supabase
  lib/gallery.ts        Fotos reales por combinación (molde + presentación + tipo)
  components/FitPhoto   Foto completa con relleno difuminado
  components/PhotoPending  Recuadro "Foto en preparación"
  lib/rules.ts          Reglas: qué cabe dónde, precios
  lib/cart.tsx          Pedido y mensaje de WhatsApp
  pages/                Inicio, Catálogo, Personaliza, Pedido
  admin/                Panel de administración
supabase/schema.sql     Tablas, permisos y bucket de fotos
```

## Correr en tu computadora

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ para publicar
```

Sin configurar nada, el sitio funciona en **modo local**: `/admin` está abierto y los cambios se guardan solo en ese navegador. Sirve para probar, pero **no para producción**.

## Conectar Supabase (para que el catálogo se guarde de verdad)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. **SQL Editor** → pega `supabase/schema.sql` **por partes** (Parte 1, 2 y 3), **cambiando el correo** de la línea `insert into public.admins` por el tuyo, y toca **Run** en cada una.
3. **Authentication → Users → Add user**: crea tu usuario con ese mismo correo y una contraseña. En **Authentication → Sign In / Providers**, desactiva "Allow new users to sign up" para que nadie más pueda registrarse.
4. **Project Settings → API**: copia la *Project URL* y la *anon public key* a un archivo `.env.local` (usa `.env.example` como guía).
5. Entra a `/admin` → **Respaldo** → **Cargar catálogo inicial en la base de datos**.

En Vercel o Netlify, pon esas mismas dos variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en la configuración del proyecto.

## Datos de prueba que hay que confirmar

- Solo la **placa ovalada grande (9.5 × 6.2 × 0.7 cm)** tiene medidas reales. La *placa ovalada chica* y la *cesta* son ejemplos.
- Los **anchos de los moldes** son estimados (margarita 6 cm, rosa 5.5, cempasúchil 6, copo 6.5, pino 4.5).
- Los **precios** de copo, pino, la placa chica y la cesta son inventados.

Todo se cambia desde `/admin`.

## Siguientes fases

- **Fase 2:** fotos reales de moldes y placas, y ajuste fino de su posición.
- **Fase 3:** cajas de plástico, cajas de opalina e impresiones en opalina por temática (la vela pegada "como flor"), más cestas de varios tamaños.
- **Más adelante:** historial de pedidos, galería de clientes y temporadas automáticas.
