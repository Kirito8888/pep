# AthlosPro

Suite web para entrenadores personales y atletas: herramientas de gimnasio, suite completa de atletismo por sectores (con módulo específico de jabalina), planificación periodizada con semáforo de fatiga neural/articular, generador determinista de microciclos y planificaciones compartidas entre amigos.

**Stack:** Next.js 15 (App Router) · TypeScript estricto · Tailwind CSS · PostgreSQL 16 · Prisma 6 · Auth.js v5 (email/contraseña) · Recharts · Vitest. No requiere ningún servicio externo.

## Módulos

| Módulo | Ruta | Contenido |
|---|---|---|
| Panel principal | `/dashboard` | Resumen semanal adaptado a la especialidad: lanzamientos por implemento, contactos, metros de pista, tonelaje, puntos de combinadas, alertas y próximos entrenamientos propios y compartidos |
| Planificador | `/planner` | Macrociclo → mesociclos (GPP, SPP, pre-competitivo, competitivo, tapering) → microciclos → sesiones multibloque; calendario semanal y completo con arrastrar y soltar; semáforo de fatiga |
| Gimnasio | `/gym` | 1RM (Epley, Brzycki, Lombardi) y tabla 50–100 %, discos por lado (barra de 20/15 kg), volumen semanal por grupo muscular, escala RPE/RIR, temporizador de descanso con alerta sonora/visual, récords (fuerza, halterofilia, balísticos) |
| A · Lanzamientos | `/athletics/throws` | Implementos reglamentarios por sexo/categoría, lastrados y aligerados con % del oficial, registro de jabalina (carrera, pasos cruzados 3/5/7, check-mark, tipo, ángulo, viento), volumen articular (codo, hombro, lumbar), checklist de prehab, balón medicinal |
| B · Saltos | `/athletics/jumps` | Talonamientos con ajuste por viento, contactos pliométricos, configurador de pértiga |
| C · Velocidad | `/athletics/sprints` | Parciales (10 m a 400 m), velocidad m/s y km/h, vallas (alturas, distancias, ritmo), relevos 4×100/4×200/4×400 con marcas de salida |
| D · Fondo | `/athletics/endurance` | Ritmos min/km y min/milla, pasos por vuelta, Riegel + VDOT, zonas de FC (Karvonen y %FCmáx), zonas de ritmo Z1–Z5, series y fartlek, ACWR |
| E · Combinadas | `/athletics/combined` | Puntuación oficial World Athletics (decatlón, heptatlón aire libre y pista cubierta, pentatlón), simulador de objetivos, validación de viento ≤ +2,0 m/s |
| Marcas | `/athletics/marks` | PB/SB por prueba; las marcas con viento ilegal no cuentan como PB/SB |
| Generador | `/generator` | Especialidad × fase × nivel × 2–6 días × equipamiento; todo editable antes de guardar |
| Social | `/friends`, `/shared` | Buscador, solicitudes, código de invitación, planes asignados a amigos, completar sesiones, comentarios y «Clonar planificación a mi cuenta» |

## Cuentas de demostración

Se cargan automáticamente al arrancar (se desactivan con `SEED_DEMO_DATA=false`). Son amigos entre sí:

| Usuario | Email | Contraseña |
|---|---|---|
| Carlos Méndez (decatleta) | `carlos@athlospro.local` | `Demo1234!` |
| Javier Ortega (jabalina/disco) | `javier@athlospro.local` | `Demo1234!` |

Es una contraseña pública de demostración. **Si expones la aplicación fuera de tu equipo, pon `SEED_DEMO_DATA=false` o cambia estas contraseñas.**

## Puesta en marcha con Docker

Requisitos: Docker Desktop (Windows, con WSL2) o Docker Engine + Compose v2 (Linux). Las migraciones de Prisma y el seed se ejecutan solos al arrancar.

### Windows (PowerShell)

```powershell
# 1. Entra en la carpeta del proyecto
cd C:\ruta\a\pep

# 2. Crea tu archivo de entorno
Copy-Item .env.example .env

# 3. Genera un secreto aleatorio para las sesiones
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Abre `.env` con el Bloc de notas, pega ese valor en `AUTH_SECRET=` y cambia `POSTGRES_PASSWORD`. Después:

```powershell
# 4. Construye y arranca todo (la primera vez tarda unos minutos)
docker compose up --build
```

Abre <http://localhost:3000>. Para parar: `Ctrl+C`, y `docker compose down` para quitar los contenedores (los datos se conservan en el volumen `athlospro_pgdata`).

### Linux

```bash
cd pep
cp .env.example .env
openssl rand -base64 32      # copia el resultado en AUTH_SECRET dentro de .env
nano .env                    # cambia también POSTGRES_PASSWORD
docker compose up --build
```

Abre <http://localhost:3000>. En segundo plano: `docker compose up --build -d`; logs: `docker compose logs -f app`.

### Comandos útiles

```bash
docker compose down            # parar (conserva los datos)
docker compose down -v         # parar y BORRAR la base de datos
docker compose up --build -d   # reconstruir tras cambiar código
```

Si el puerto 3000 está ocupado, cambia `APP_PORT` en `.env`.

## Subir el proyecto a GitHub (repositorio limpio)

1. Crea en <https://github.com/new> un repositorio **vacío** (sin README, `.gitignore` ni licencia).
2. En la carpeta del proyecto:

```bash
git init
git branch -M main
git add .
git status          # comprueba que NO aparecen .env, node_modules ni .next
git commit -m "AthlosPro: versión inicial"
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

`.gitignore` ya excluye `.env`, `node_modules`, `.next` y los volúmenes de datos; solo se sube `.env.example`, sin secretos. En Windows los comandos son idénticos en PowerShell. Si GitHub pide autenticación, usa un *Personal Access Token* como contraseña o `gh auth login`.

## Desarrollo sin Docker

Requiere Node 22 y un PostgreSQL accesible.

```bash
cp .env.example .env     # ajusta DATABASE_URL a tu PostgreSQL local
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev              # http://localhost:3000
```

Otros comandos: `npm test` (fórmulas y generador), `npm run typecheck`, `npm run lint`, `npm run build`.

## Estructura

```
├── Dockerfile · docker-compose.yml · docker-entrypoint.sh
├── prisma/            schema.prisma · migrations/ · seed.ts
└── src/
    ├── auth.ts        Auth.js (credenciales, sesión JWT, bcryptjs)
    ├── lib/
    │   ├── athletics/ combined.ts (constantes WA) · implements.ts · sprint.ts · hurdles.ts
    │   │              relays.ts · endurance.ts · jumps.ts · events.ts
    │   ├── gym/       oneRm.ts · plates.ts · muscleVolume.ts
    │   ├── load/      metrics.ts · fatigue.ts (semáforo SNC/articular)
    │   ├── generator/ index.ts · phases.ts · helpers.ts · templates/*
    │   └── permissions.ts · plans.ts · validators.ts · dashboard.ts
    ├── components/    UI, gráficas, planificador
    └── app/           páginas (app)/(auth) y api/*
```

## Notas de rigor

- Las **fórmulas** (World Athletics, 1RM, Riegel, VDOT, Karvonen) son exactas y tienen pruebas (`src/lib/lib.test.ts`), incluidos los récords del mundo de decatlón (9126) y heptatlón (7291).
- Los **umbrales del semáforo de fatiga** y de volumen articular (`src/lib/load/fatigue.ts`, `src/lib/athletics/implements.ts`, `src/lib/athletics/jumps.ts`) son heurísticas de entrenador, no constantes científicas: ajústalos al atleta.
- Los parciales de sprint, el ritmo entre vallas y las marcas de salida de relevos son **modelos orientativos**, no mediciones.
- El generador es determinista y local: la misma entrada produce siempre la misma planificación. Organiza cada sesión como movilidad/prehab → velocidad/técnica → saltos/lanzamientos → fuerza/potencia → metabólico, y nunca encadena dos días de alta demanda neural.
- La aplicación es una base sólida pero no ha pasado una auditoría de seguridad: antes de exponerla a Internet añade HTTPS (proxy inverso), limitación de intentos de acceso y copias de seguridad de la base de datos.
