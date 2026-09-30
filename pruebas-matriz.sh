#!/usr/bin/env bash
# Matriz de pruebas - Paso 7 de la practica Semana 2
# Uso: bash pruebas-matriz.sh   (con el servidor corriendo en localhost:3000)
B="http://localhost:3000/api/v1/productos"
CURL="curl -s --noproxy *"
ok=0; fail=0

probar() { # $1 etiqueta  $2 esperado  $3.. comando curl
  local etiqueta="$1"; local esperado="$2"; shift 2
  local code body
  body=$("$@" -o /tmp/body -D /tmp/head -w "%{http_code}")
  code="$body"
  if [ "$code" = "$esperado" ]; then
    echo "OK   | $etiqueta | esperado $esperado | obtenido $code"
    ok=$((ok+1))
  else
    echo "FALLA| $etiqueta | esperado $esperado | obtenido $code"
    fail=$((fail+1))
  fi
  [ -s /tmp/body ] && echo "       cuerpo: $(head -c 160 /tmp/body)"
  grep -i "^location" /tmp/head | sed 's/^/       /'
}

echo "=== MATRIZ DE PRUEBAS CRUD ==="
probar "1. POST con nombre vacio"   400 curl -s --noproxy '*' -X POST "$B" -H "Content-Type: application/json" -d '{"nombre":"","precio":25.00}'
probar "2. POST valido"             201 curl -s --noproxy '*' -X POST "$B" -H "Content-Type: application/json" -d '{"nombre":"Audifonos","precio":25.00}'
probar "3. GET con id inexistente"  404 curl -s --noproxy '*' "$B/999"
probar "4. PUT con precio negativo" 400 curl -s --noproxy '*' -X PUT "$B/1" -H "Content-Type: application/json" -d '{"nombre":"Teclado","precio":-5}'
probar "5. PUT valido"              204 curl -s --noproxy '*' -X PUT "$B/1" -H "Content-Type: application/json" -d '{"nombre":"Teclado mecanico RGB","precio":55.00}'
probar "6. PATCH de precio valido"  200 curl -s --noproxy '*' -X PATCH "$B/1" -H "Content-Type: application/json" -d '{"precio":60.00}'
probar "7. DELETE existente"        204 curl -s --noproxy '*' -X DELETE "$B/2"
probar "8. DELETE repetido"         404 curl -s --noproxy '*' -X DELETE "$B/2"

echo "=== Extras ==="
probar "9. GET lista"               200 curl -s --noproxy '*' "$B"
probar "10. PATCH id inexistente"   404 curl -s --noproxy '*' -X PATCH "$B/999" -H "Content-Type: application/json" -d '{"precio":10}'
probar "11. GET /abc (ParseIntPipe)" 400 curl -s --noproxy '*' "$B/abc"

echo
echo "RESULTADO: $ok correctas, $fail fallidas"
