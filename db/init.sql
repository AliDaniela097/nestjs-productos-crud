-- =====================================================================
-- Semana 2 - Integracion de Sistemas
-- Esquema de la base de datos + roles que PostgREST necesita
--
-- Este archivo se ejecuta UNA sola vez, cuando el contenedor de
-- PostgreSQL arranca con el volumen vacio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Esquema expuesto
-- PostgREST publica UN esquema. No exponemos "public" para no dejar
-- visible cualquier tabla interna que se cree despues.
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS api;

-- ---------------------------------------------------------------------
-- 2. Tabla de productos
-- Es el mismo recurso del contrato de la Semana 2: id, nombre, precio.
-- Las restricciones CHECK replican en la base las mismas reglas que los
-- DTOs validan en NestJS (nombre no vacio, precio positivo).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api.productos (
  id     SERIAL PRIMARY KEY,
  nombre TEXT           NOT NULL CHECK (length(trim(nombre)) > 0),
  precio NUMERIC(10, 2) NOT NULL CHECK (precio > 0)
);

-- Datos iniciales, los mismos tres productos del laboratorio
INSERT INTO api.productos (nombre, precio) VALUES
  ('Teclado mecánico',   45.90),
  ('Mouse inalámbrico',  19.50),
  ('Monitor 24"',       129.99)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Roles de PostgREST
--
-- PostgREST se conecta SIEMPRE con el rol "authenticator", que por si
-- solo no puede leer nada (NOINHERIT). Para cada peticion cambia
-- temporalmente al rol que corresponda. Sin token, usa "web_anon".
--
-- Este es el modelo de seguridad de PostgREST: los permisos no viven en
-- el codigo, viven en la base de datos como GRANTs de PostgreSQL.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_anon') THEN
    CREATE ROLE web_anon NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'clave_authenticator';
  END IF;
END
$$;

-- El anonimo puede ver el esquema y operar sobre la tabla.
-- En un sistema real el anonimo solo tendria SELECT; aqui le damos el
-- CRUD completo porque la practica exige demostrar los cuatro verbos.
GRANT USAGE ON SCHEMA api TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.productos TO web_anon;

-- Necesario para que INSERT pueda generar el id (columna SERIAL)
GRANT USAGE, SELECT ON SEQUENCE api.productos_id_seq TO web_anon;

-- authenticator solo tiene derecho a "convertirse" en web_anon
GRANT web_anon TO authenticator;

-- ---------------------------------------------------------------------
-- 4. Usuario para la aplicacion NestJS
--
-- NestJS NO usa los roles de PostgREST: se conecta como una aplicacion
-- normal, con su propio usuario. Asi las dos APIs comparten los datos
-- pero no comparten credenciales ni permisos.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nest_app') THEN
    CREATE ROLE nest_app LOGIN PASSWORD 'clave_nest';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA api TO nest_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.productos TO nest_app;
GRANT USAGE, SELECT ON SEQUENCE api.productos_id_seq TO nest_app;
