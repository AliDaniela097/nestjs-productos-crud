import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProductosService } from './productos.service';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarPrecioDto } from './dto/actualizar-precio.dto';

@ApiTags('Productos')
@Controller('api/v1/productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los productos' })
  @ApiResponse({ status: 200, description: 'Lista de productos.' })
  listar() {
    return this.productosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por id (con enlaces HATEOAS)' })
  @ApiResponse({ status: 200, description: 'Producto encontrado con _links.' })
  @ApiResponse({ status: 404, description: 'El producto no existe.' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    const producto = this.productosService.findOne(id);
    // HATEOAS (nivel 3 de Richardson): la respuesta indica las acciones posibles.
    return {
      ...producto,
      _links: {
        self: { href: `/api/v1/productos/${producto.id}` },
        actualizar: {
          href: `/api/v1/productos/${producto.id}`,
          method: 'PUT',
        },
        eliminar: {
          href: `/api/v1/productos/${producto.id}`,
          method: 'DELETE',
        },
        coleccion: { href: '/api/v1/productos' },
      },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un producto' })
  @ApiResponse({ status: 201, description: 'Creado. Incluye header Location.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  crear(
    @Body() dto: CrearProductoDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const nuevo = this.productosService.crear(dto);
    res.setHeader('Location', `/api/v1/productos/${nuevo.id}`);
    return nuevo;
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reemplazar un producto completo' })
  @ApiResponse({ status: 204, description: 'Reemplazado, sin cuerpo.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 404, description: 'El producto no existe.' })
  reemplazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearProductoDto,
  ) {
    this.productosService.reemplazar(id, dto); // 204: sin cuerpo
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar solo el precio' })
  @ApiResponse({ status: 200, description: 'Producto actualizado.' })
  @ApiResponse({ status: 400, description: 'Precio inválido.' })
  @ApiResponse({ status: 404, description: 'El producto no existe.' })
  actualizarPrecio(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPrecioDto,
  ) {
    return this.productosService.actualizarPrecio(id, dto); // 200: devolvemos el recurso
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un producto' })
  @ApiResponse({ status: 204, description: 'Eliminado, sin cuerpo.' })
  @ApiResponse({ status: 404, description: 'El producto no existe.' })
  eliminar(@Param('id', ParseIntPipe) id: number) {
    this.productosService.eliminar(id); // 204
  }
}
