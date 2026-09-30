import { Injectable, NotFoundException } from '@nestjs/common';
import { Producto } from './producto.entity';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarPrecioDto } from './dto/actualizar-precio.dto';

@Injectable()
export class ProductosService {
  private productos: Producto[] = [
    { id: 1, nombre: 'Teclado mecánico', precio: 45.9 },
    { id: 2, nombre: 'Mouse inalámbrico', precio: 19.5 },
    { id: 3, nombre: 'Monitor 24"', precio: 129.99 },
  ];

  findAll(): Producto[] {
    return this.productos;
  }

  findOne(id: number): Producto {
    const producto = this.productos.find((p) => p.id === id);
    if (!producto) throw new NotFoundException(`Producto ${id} no existe`);
    return producto;
  }

  crear(dto: CrearProductoDto): Producto {
    // Si la lista quedó vacía, Math.max(...[]) da -Infinity: por eso el ternario.
    const nuevoId = this.productos.length
      ? Math.max(...this.productos.map((p) => p.id)) + 1
      : 1;
    const nuevo: Producto = { id: nuevoId, ...dto };
    this.productos.push(nuevo);
    return nuevo;
  }

  // PUT: reemplaza el recurso completo. Idempotente.
  reemplazar(id: number, dto: CrearProductoDto): void {
    const index = this.productos.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Producto ${id} no existe`);
    this.productos[index] = { id, ...dto };
  }

  // PATCH: cambia solo el precio y devuelve el recurso resultante.
  actualizarPrecio(id: number, dto: ActualizarPrecioDto): Producto {
    const index = this.productos.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Producto ${id} no existe`);
    this.productos[index].precio = dto.precio;
    return this.productos[index];
  }

  // DELETE: elimina; repetido sobre el mismo id lanza 404, nunca 500.
  eliminar(id: number): void {
    const index = this.productos.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Producto ${id} no existe`);
    this.productos.splice(index, 1);
  }
}
