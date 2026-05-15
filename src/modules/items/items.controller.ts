import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';

@ApiTags('items')
@ApiBearerAuth()
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo item' })
  @ApiCreatedResponse({ description: 'Item creado' })
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar items activos, filtro opcional por tipo' })
  @ApiOkResponse({ description: 'Lista de items' })
  findAll(@Query() query: QueryItemsDto) {
    return this.itemsService.findAll(query.type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un item con disponibilidad' })
  @ApiOkResponse({ description: 'Detalle del item con isAvailable' })
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar título o tipo de un item' })
  @ApiOkResponse({ description: 'Item actualizado' })
  update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Item desactivado (soft delete)' })
  @ApiOperation({ summary: 'Desactivar un item (soft delete)' })
  remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }
}
