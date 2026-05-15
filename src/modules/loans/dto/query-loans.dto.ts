import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsUUID, IsOptional } from 'class-validator';
import { LoanStatus } from '@modules/loans/entities/loan.entity';

export class QueryLoansDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  itemId?: string;

  @ApiPropertyOptional({ enum: LoanStatus })
  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;
}
