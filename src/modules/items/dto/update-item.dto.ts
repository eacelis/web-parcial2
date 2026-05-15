import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ItemType } from '@modules/items/entities/item.entity';

export class UpdateItemDto {
  @ApiPropertyOptional({ example: 'Clean Code 2nd Ed.' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ enum: ItemType, example: ItemType.BOOK })
  @IsEnum(ItemType)
  @IsOptional()
  type?: ItemType;
}
