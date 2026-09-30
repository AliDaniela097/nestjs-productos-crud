import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Producto } from './producto.entity';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarPrecioDto } from './dto/actualizar-precio.dto';
import { LessThanOrEqual, Repository } from 'typeorm';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
  ) {}

  findAll(): Promise<Producto[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Producto> {
    const producto = await this.repo.findOneBy({ id });
    if (!producto) throw new NotFoundException(`Producto ${id} no existe`);
    return producto;

  }
    // Filtro: productos con precio menor o igual al límite indicado.
  findBaratos(precioMaximo: number): Promise<Producto[]> {
    return this.repo.find({
      where: { precio: LessThanOrEqual(precioMaximo) },
      order: { id: 'ASC' },
    });
  }

  // POST: la base genera el id con la secuencia SERIAL.
  crear(dto: CrearProductoDto): Promise<Producto> {
    const nuevo = this.repo.create(dto);
    return this.repo.save(nuevo);
  }

  // PUT: reemplaza el recurso completo. Idempotente.
  async reemplazar(id: number, dto: CrearProductoDto): Promise<void> {
    const resultado = await this.repo.update({ id }, dto);
    if (resultado.affected === 0) {
      throw new NotFoundException(`Producto ${id} no existe`);
    }
  }

  // PATCH: cambia solo el precio y devuelve el recurso resultante.
  async actualizarPrecio(
    id: number,
    dto: ActualizarPrecioDto,
  ): Promise<Producto> {
    const resultado = await this.repo.update({ id }, { precio: dto.precio });
    if (resultado.affected === 0) {
      throw new NotFoundException(`Producto ${id} no existe`);
    }
    return this.findOne(id);
  }

  // DELETE: repetido sobre el mismo id lanza 404, nunca 500.
  async eliminar(id: number): Promise<void> {
    const resultado = await this.repo.delete({ id });
    if (resultado.affected === 0) {
      throw new NotFoundException(`Producto ${id} no existe`);
    }
  }
}
