import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Item, ItemType } from './entities/item.entity';
import { Loan, LoanStatus } from '@modules/loans/entities/loan.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,
  ) {}

  async create(dto: CreateItemDto): Promise<Item> {
    const existing = await this.itemsRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`El código "${dto.code}" ya existe`);
    }
    const item = this.itemsRepository.create(dto);
    return this.itemsRepository.save(item);
  }

  async findAll(type?: ItemType): Promise<Item[]> {
    const where: FindOptionsWhere<Item> = { isActive: true };
    if (type) {
      where.type = type;
    }
    return this.itemsRepository.find({ where });
  }

  async findOne(id: string): Promise<Item & { isAvailable: boolean }> {
    const item = await this.itemsRepository.findOne({ where: { id, isActive: true } });
    if (!item) {
      throw new NotFoundException(`Item "${id}" no encontrado`);
    }
    const isAvailable = await this.checkAvailability(id);
    return { ...item, isAvailable };
  }

  async update(id: string, dto: UpdateItemDto): Promise<Item> {
    const item = await this.itemsRepository.findOne({ where: { id, isActive: true } });
    if (!item) {
      throw new NotFoundException(`Item "${id}" no encontrado`);
    }
    Object.assign(item, dto);
    return this.itemsRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.itemsRepository.findOne({ where: { id, isActive: true } });
    if (!item) {
      throw new NotFoundException(`Item "${id}" no encontrado`);
    }
    item.isActive = false;
    await this.itemsRepository.save(item);
  }

  private async checkAvailability(itemId: string): Promise<boolean> {
    const count = await this.loansRepository.count({
      where: {
        itemId,
        status: LoanStatus.ACTIVE,
      },
    });
    return count === 0;
  }
}
