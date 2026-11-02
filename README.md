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

- **Capas:** fondo según la temática → placa (atrás) → vela o jabón → placa (frente, para cestas).
- **Se cambia como en un videojuego:** con las flechas ‹ ›, deslizando el dedo sobre la imagen (arriba cambia el molde, abajo cambia la placa) o tocando las miniaturas.
- **Solo ofrece lo que cabe:** cada molde tiene su ancho en cm y cada placa su largo y ancho. Si no cabe, la placa aparece tachada y no se puede agregar. Las placas **contenedor** (la cera va dentro) solo se ofrecen para velas. Desde el admin se puede bloquear a mano un molde en una placa.
- **Colores:** el producto se pinta del color elegido. La placa marmoleada permite elegir el color de las vetas.
- **Vela encendida:** con llamita animada.
- **Compartir y descargar:** el diseño queda en la URL (`/personaliza?molde=rosa&tipo=vela&color=rosa&placa=ovalada-grande…`) y se puede descargar como PNG.

### Fotos reales en lugar de ilustraciones

Mientras no hay fotos, los moldes y placas se **dibujan por código**. Cuando tengas fotos:

1. Toma **una foto por molde** (idealmente en blanco o color muy claro) y **una por placa**, todas desde el mismo ángulo: de frente y un poco desde arriba (~30°), con tripié, fondo liso y luz de día indirecta.
2. Quita el fondo (por ejemplo, con Canva → "Eliminar fondo") y guarda en PNG.
3. En `/admin` → Moldes o Placas → **Subir foto**. En los moldes, marca **"Teñir la foto"** para que el sitio la pinte del color que elija el cliente.

## Tecnología

| Parte | Elección |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Gráficos | SVG en capas (nítido en cualquier pantalla y fácil de recolorear) |
| Datos | **Supabase** (Postgres + almacenamiento de fotos + login). Sin Supabase funciona en *modo local* |
| Pedidos | Enlace de WhatsApp con el mensaje ya armado |
| Hosting | Vercel o Netlify (gratis). Ya incluye `vercel.json` y `public/_redirects` |

### Estructura

```
src/
  types.ts              Modelo de datos (molde, placa, color, esencia, colección)
  data/seed.ts          Catálogo inicial (5 moldes, 3 placas, 7 esencias, 10 colores)
  data/repo.ts          Capa de datos: modo local (navegador) o Supabase
  art/molds.tsx         Ilustraciones de los moldes
  art/plates.tsx        Placas de yeso marmoleadas y cestas
  components/Stage.tsx  Escenario en capas del personalizador
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
2. **SQL Editor** → pega `supabase/schema.sql`, **cambia el correo** de la línea `insert into public.admins` por el tuyo y ejecútalo.
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
