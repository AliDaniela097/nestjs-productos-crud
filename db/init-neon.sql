-- =====================================================================
-- Esquema para NEON (despliegue en la nube)
--
-- Es el equivalente de db/init.sql, con una diferencia importante:
-- Neon no permite crear roles con contrasena propia desde SQL. Por eso
-- PostgREST se conecta con el rol dueno de la base (neondb_owner) y
-- "web_anon" es un rol NOLOGIN al que ese dueno puede cambiar.
--
-- Como ejecutarlo:
--   Consola de Neon -> tu proyecto -> SQL Editor -> pegar y Run.
-- =====================================================================

-- 1. Esquema expuesto por PostgREST
CREATE SCHEMA IF NOT EXISTS api;

-- 2. Tabla de productos, identica a la version local
CREATE TABLE IF NOT EXISTS api.productos (
  id     SERIAL PRIMARY KEY,
  nombre TEXT           NOT NULL CHECK (length(trim(nombre)) > 0),
  precio NUMERIC(10, 2) NOT NULL CHECK (precio > 0)
);

-- 3. Datos iniciales (solo si la tabla esta vacia)
INSERT INTO api.productos (nombre, precio)
SELECT * FROM (VALUES
  ('Teclado mecánico',   45.90),
  ('Mouse inalámbrico',  19.50),
  ('Monitor 24"',       129.99)
) AS v(nombre, precio)
WHERE NOT EXISTS (SELECT 1 FROM api.productos);

-- 4. Rol anonimo de PostgREST
-- NOLOGIN: no se conecta por si mismo, solo se "asume" desde el rol
-- dueno, que es el que PostgREST usa como authenticator.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_anon') THEN
    CREATE ROLE web_anon NOLOGIN;
  END IF;
END
$$;

-- El dueno de la base debe poder cambiar a web_anon.
-- current_user es el rol con el que estas ejecutando este script
-- (normalmente neondb_owner), asi funciona sea cual sea su nombre.
DO $$
BEGIN
  EXECUTE format('GRANT web_anon TO %I', current_user);
END
$$;

-- 5. Permisos del rol anonimo sobre los datos
GRANT USAGE ON SCHEMA api TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.productos TO web_anon;
GRANT USAGE, SELECT ON SEQUENCE api.productos_id_seq TO web_anon;

-- 6. Comprobacion: debe devolver las 3 filas iniciales
SELECT * FROM api.productos ORDER BY id;
