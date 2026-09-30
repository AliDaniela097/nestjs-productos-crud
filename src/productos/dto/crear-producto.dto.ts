import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CrearProductoDto {
  @ApiProperty({ example: 'Audífonos', description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 25.0, description: 'Precio unitario, mayor que 0' })
  @IsNumber()
  @IsPositive()
  precio: number;
}
