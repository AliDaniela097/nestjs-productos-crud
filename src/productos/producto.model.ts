import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

// Tipo GraphQL. En el esquema se llamará "Producto".
@ObjectType('Producto', { description: 'Producto del catálogo' })
export class ProductoModel {
  @Field(() => Int)
  id: number;

  @Field()
  nombre: string;

  @Field(() => Float)
  precio: number;
}