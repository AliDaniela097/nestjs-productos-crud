import { Args, Float, Int, Query, Resolver } from '@nestjs/graphql';
import { ProductoModel } from './producto.model';
import { ProductosService } from './productos.service';

@Resolver(() => ProductoModel)
export class ProductosResolver {
  // Se reutiliza el mismo servicio que usa el controller REST.
  constructor(private readonly productosService: ProductosService) {}

  @Query(() => [ProductoModel], { name: 'productos' })
  productos() {
    return this.productosService.findAll();
  }

    @Query(() => [ProductoModel], { name: 'productosBaratos' })
  productosBaratos(
    @Args('precioMaximo', { type: () => Float }) precioMaximo: number,
  ) {
    return this.productosService.findBaratos(precioMaximo);
  }
}