import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsISO8601 } from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ example: '2026-06-15T00:00:00.000Z' })
  @IsISO8601()
  dueAt: string;
}
