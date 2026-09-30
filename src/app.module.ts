import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosModule } from './productos/productos.module';
import { Producto } from './productos/producto.entity';
import { ConfigController } from './config.controller';

@Module({
  imports: [
    // Lee el archivo .env y lo deja disponible en process.env
    ConfigModule.forRoot({ isGlobal: true }),

    // Sirve el frontend (carpeta public/) en la raiz del sitio.
    // exclude evita que se trague las rutas de la API y de Swagger.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/{*splat}', '/swagger/{*splat}'],
    }),

    // Conexion a PostgreSQL. Ningun dato sensible va escrito aqui:
    // todo sale de variables de entorno (factor III de Twelve-Factor App).
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USER ?? 'nest_app',
      password: process.env.DB_PASSWORD ?? 'clave_nest',
      database: process.env.DB_NAME ?? 'productos_db',
      entities: [Producto],
      // El esquema lo crea db/init.sql, no TypeORM. Mantener esto en
      // false evita que la aplicacion altere la tabla por su cuenta.
      synchronize: false,
      // Azure y la mayoria de Postgres gestionados exigen SSL
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }),

    ProductosModule,
  ],
  controllers: [ConfigController],
})
export class AppModule {}
