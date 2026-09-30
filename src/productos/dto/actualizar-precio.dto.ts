import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class ActualizarPrecioDto {
  @ApiProperty({ example: 60.0, description: 'Nuevo precio, mayor que 0' })
  @IsNumber()
  @IsPositive()
  precio: number;
}
