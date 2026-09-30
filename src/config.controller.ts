import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

/**
 * Entrega al frontend la configuracion que solo el servidor conoce.
 *
 * El navegador no puede leer variables de entorno, y la URL de PostgREST
 * cambia entre local y produccion. En vez de dejarla escrita en el HTML,
 * el servidor la publica aqui como un archivo JavaScript.
 *
 * Va bajo /api/ porque esa ruta esta excluida del servido de archivos
 * estaticos en app.module.ts.
 */
@ApiExcludeController()
@Controller('api')
export class ConfigController {
  @Get('config.js')
  @Header('Content-Type', 'application/javascript')
  @Header('Cache-Control', 'no-store')
  config(): string {
    const url = process.env.POSTGREST_URL ?? 'http://localhost:3001';
    return `window.POSTGREST_URL = ${JSON.stringify(url)};`;
  }
}
