#!/usr/bin/env bash
# =====================================================================
# Matriz de pruebas - Paso 7 de la practica Semana 2
#
# Prueba los dos mecanismos de integracion sobre la MISMA base de datos:
#   1) La API de NestJS  (escrita a mano)
#   2) PostgREST         (generada desde el esquema)
#
# Uso:  bash pruebas-matriz.sh
# Requiere: docker compose up -d   y   npm run start:dev
# =====================================================================
NEST="http://localhost:3000/api/v1/productos"
PGRST="http://localhost:3001/productos"

ok=0; fail=0

probar() {
  local etiqueta="$1"; local esperado="$2"; shift 2
  local code
  code=$("$@" -o /tmp/cuerpo -D /tmp/cabeceras -w "%{http_code}")
  if [ "$code" = "$esperado" ]; then
    printf 'OK    | %-34s | esperado %-3s | obtenido %s\n' "$etiqueta" "$esperado" "$code"
    ok=$((ok+1))
  else
    printf 'FALLA | %-34s | esperado %-3s | obtenido %s\n' "$etiqueta" "$esperado" "$code"
    fail=$((fail+1))
  fi
  [ -s /tmp/cuerpo ] && echo "        cuerpo: $(head -c 150 /tmp/cuerpo)"
  grep -i "^location" /tmp/cabeceras | sed 's/^/        /'
  return 0
}

echo "=========================================================="
echo " BLOQUE 1 - API NestJS (matriz oficial del Paso 7)"
echo "=========================================================="
probar "POST con nombre vacio"   400 curl -s -X POST "$NEST" -H "Content-Type: application/json" -d '{"nombre":"","precio":25.00}'
probar "POST valido"             201 curl -s -X POST "$NEST" -H "Content-Type: application/json" -d '{"nombre":"Audifonos","precio":25.00}'
probar "GET con id inexistente"  404 curl -s "$NEST/999"
probar "PUT con precio negativo" 400 curl -s -X PUT "$NEST/1" -H "Content-Type: application/json" -d '{"nombre":"Teclado","precio":-5}'
probar "PUT valido"              204 curl -s -X PUT "$NEST/1" -H "Content-Type: application/json" -d '{"nombre":"Teclado mecanico RGB","precio":55.00}'
probar "PATCH de precio valido"  200 curl -s -X PATCH "$NEST/1" -H "Content-Type: application/json" -d '{"precio":60.00}'
probar "DELETE existente"        204 curl -s -X DELETE "$NEST/3"
probar "DELETE repetido"         404 curl -s -X DELETE "$NEST/3"

echo
echo "=========================================================="
echo " BLOQUE 2 - NestJS, casos adicionales"
echo "=========================================================="
probar "GET lista"               200 curl -s "$NEST"
probar "PATCH id inexistente"    404 curl -s -X PATCH "$NEST/999" -H "Content-Type: application/json" -d '{"precio":10}'
probar "GET /abc (ParseIntPipe)" 400 curl -s "$NEST/abc"
probar "POST con campo extra id" 400 curl -s -X POST "$NEST" -H "Content-Type: application/json" -d '{"nombre":"X","precio":5,"id":999}'

echo
echo "=========================================================="
echo " BLOQUE 3 - PostgREST (misma base, API autogenerada)"
echo "=========================================================="
probar "GET lista"                200 curl -s "$PGRST"
probar "GET id inexistente"       200 curl -s "$PGRST?id=eq.999"
probar "POST valido"              201 curl -s -X POST "$PGRST" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"nombre":"Webcam","precio":30.00}'
probar "POST viola CHECK precio"  400 curl -s -X POST "$PGRST" -H "Content-Type: application/json" -d '{"nombre":"Malo","precio":-5}'
probar "PATCH de precio"          204 curl -s -X PATCH "$PGRST?id=eq.2" -H "Content-Type: application/json" -d '{"precio":22.00}'
probar "DELETE existente"         204 curl -s -X DELETE "$PGRST?id=eq.2"
probar "DELETE repetido"          204 curl -s -X DELETE "$PGRST?id=eq.2"

echo
echo "=========================================================="
printf ' RESULTADO: %s correctas, %s fallidas\n' "$ok" "$fail"
echo "=========================================================="
echo
echo "Nota: en el bloque 3 los codigos esperados son distintos a proposito."
echo "PostgREST opera sobre CONJUNTOS de filas, no sobre recursos unicos:"
echo "un filtro que no encuentra nada es un conjunto vacio (200 / 204),"
echo "no un recurso inexistente (404). La comparacion esta en bitacora.md."
