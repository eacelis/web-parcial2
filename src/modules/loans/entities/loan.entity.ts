import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '@modules/users/entities/user.entity';
import { Item } from '@modules/items/entities/item.entity';

export enum LoanStatus {
  ACTIVE = 'active',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
  LOST = 'lost',
}

@Entity('loans')
@Index(['itemId', 'status'])
@Index(['userId', 'status'])
export class Loan {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'item_id' })
  itemId: string;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'loaned_at' })
  loanedAt: Date;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'due_at' })
  dueAt: Date;

  @ApiProperty({ required: false })
  @Column({ type: 'timestamptz', name: 'returned_at', nullable: true })
  returnedAt: Date | null;

  @ApiProperty({ enum: LoanStatus })
  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.ACTIVE })
  status: LoanStatus;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'fine_amount', default: '0.00' })
  fineAmount: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.loans, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Item, (item) => item.loans, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item: Item;
}
