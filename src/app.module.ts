import { Module } from '@nestjs/common';
import { ProductosModule } from './productos/productos.module';

@Module({
  imports: [ProductosModule],
})
export class AppModule {}
