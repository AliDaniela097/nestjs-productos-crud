import { ApiProperty } from '@nestjs/swagger';

export class Producto {
  @ApiProperty({ example: 1, description: 'Identificador unico del producto' })
  id: number;

  @ApiProperty({ example: 'Teclado mecanico', description: 'Nombre comercial' })
  nombre: string;

  @ApiProperty({ example: 45.9, description: 'Precio unitario en USD' })
  precio: number;
}
