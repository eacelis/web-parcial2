import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { QueryLoansDto } from './dto/query-loans.dto';

@ApiTags('loans')
@ApiBearerAuth()
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo préstamo (R1-R3)' })
  @ApiCreatedResponse({ description: 'Préstamo creado' })
  create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar préstamos con filtros opcionales' })
  @ApiOkResponse({ description: 'Lista de préstamos' })
  findAll(@Query() query: QueryLoansDto) {
    return this.loansService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un préstamo' })
  @ApiOkResponse({ description: 'Detalle del préstamo' })
  findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }

  @Patch(':id/return')
  @ApiOperation({ summary: 'Registrar devolución y calcular multa (R4)' })
  @ApiOkResponse({ description: 'Préstamo devuelto con multa calculada' })
  returnLoan(@Param('id') id: string) {
    return this.loansService.returnLoan(id);
  }

  @Patch(':id/mark-lost')
  @ApiOperation({ summary: 'Marcar préstamo como perdido (R5)' })
  @ApiOkResponse({ description: 'Préstamo marcado como perdido' })
  markLost(@Param('id') id: string) {
    return this.loansService.markLost(id);
  }
}
