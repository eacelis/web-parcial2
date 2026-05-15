import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ItemType } from '@modules/items/entities/item.entity';

export class QueryItemsDto {
  @ApiPropertyOptional({ enum: ItemType, example: ItemType.BOOK })
  @IsEnum(ItemType)
  @IsOptional()
  type?: ItemType;
}
