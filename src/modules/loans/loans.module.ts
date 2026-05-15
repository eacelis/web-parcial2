import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from './entities/loan.entity';
import { Item } from '@modules/items/entities/item.entity';
import { User } from '@modules/users/entities/user.entity';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Loan, Item, User])],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
