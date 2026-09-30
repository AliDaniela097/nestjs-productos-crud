import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// La entidad ahora mapea la tabla api.productos de PostgreSQL.
// Es la MISMA tabla que expone PostgREST: una sola fuente de datos,
// dos mecanismos de integracion encima.
@Entity({ schema: 'api', name: 'productos' })
export class Producto {
  @ApiProperty({ example: 1, description: 'Identificador unico del producto' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Teclado mecánico', description: 'Nombre comercial' })
  @Column({ type: 'text' })
  nombre: string;

  @ApiProperty({ example: 45.9, description: 'Precio unitario en USD' })
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    // PostgreSQL devuelve NUMERIC como string para no perder precision.
    // Este transformer lo convierte a number al leer, para que el JSON
    // salga con 45.9 y no con "45.90".
    transformer: {
      to: (valor: number) => valor,
      from: (valor: string) => (valor === null ? null : parseFloat(valor)),
    },
  })
  precio: number;
}
