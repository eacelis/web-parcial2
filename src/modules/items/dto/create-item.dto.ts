import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { ItemType } from '@modules/items/entities/item.entity';

export class CreateItemDto {
  @ApiProperty({ example: 'LIB-001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Clean Code' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: ItemType, example: ItemType.BOOK })
  @IsEnum(ItemType)
  type: ItemType;
}
