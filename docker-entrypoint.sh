#!/bin/sh
set -e

echo "[athlospro] Aplicando migraciones de base de datos..."
attempt=0
until npx prisma migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 10 ]; then
    echo "[athlospro] No se pudo conectar con la base de datos tras $attempt intentos." >&2
    exit 1
  fi
  echo "[athlospro] Base de datos no disponible todavía; reintento $attempt/10 en 3 s..."
  sleep 3
done

echo "[athlospro] Cargando datos de demostración (si procede)..."
npx tsx prisma/seed.ts

echo "[athlospro] Iniciando la aplicación en el puerto ${PORT:-3000}..."
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
