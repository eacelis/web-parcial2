import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { Loan, LoanStatus } from './entities/loan.entity';
import { Item } from '@modules/items/entities/item.entity';
import { User } from '@modules/users/entities/user.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { QueryLoansDto } from './dto/query-loans.dto';

@Injectable()
export class LoansService {
  private readonly maxLoanDays: number;
  private readonly maxActiveLoans: number;
  private readonly dailyFineRate: number;

  constructor(
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.maxLoanDays = this.configService.get<number>('loans.maxLoanDays', 30);
    this.maxActiveLoans = this.configService.get<number>('loans.maxActivePerUser', 3);
    this.dailyFineRate = this.configService.get<number>('loans.dailyFineRate', 0.5);
  }

  async create(dto: CreateLoanDto): Promise<Loan> {
    const user = await this.usersRepository.findOne({
      where: { id: dto.userId, isActive: true },
    });
    if (!user) {
      throw new NotFoundException(`Usuario "${dto.userId}" no encontrado o inactivo`);
    }

    const item = await this.itemsRepository.findOne({
      where: { id: dto.itemId, isActive: true },
    });
    if (!item) {
      throw new NotFoundException(`Item "${dto.itemId}" no encontrado o inactivo`);
    }

    const loanedAt = new Date();
    const dueAt = new Date(dto.dueAt);

    // R1: dueAt > loanedAt && dueAt - loanedAt <= MAX_LOAN_DAYS
    if (dueAt <= loanedAt) {
      throw new BadRequestException('dueAt debe ser posterior a la fecha actual');
    }
    const diffMs = dueAt.getTime() - loanedAt.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > this.maxLoanDays) {
      throw new BadRequestException(
        `El préstamo no puede exceder ${this.maxLoanDays} días (solicitado: ${diffDays})`,
      );
    }

    // R2: item no puede tener préstamo active u overdue
    const blockingLoan = await this.loansRepository.findOne({
      where: [
        { itemId: dto.itemId, status: LoanStatus.ACTIVE },
        { itemId: dto.itemId, status: LoanStatus.OVERDUE },
      ],
    });
    if (blockingLoan) {
      throw new ConflictException(
        `El item ya tiene un préstamo activo (loanId: ${blockingLoan.id})`,
      );
    }

    // R3: usuario no puede exceder MAX_ACTIVE_LOANS
    const activeCount = await this.loansRepository.count({
      where: [
        { userId: dto.userId, status: LoanStatus.ACTIVE },
        { userId: dto.userId, status: LoanStatus.OVERDUE },
      ],
    });
    if (activeCount >= this.maxActiveLoans) {
      throw new ConflictException(
        `El usuario ya tiene ${activeCount} préstamos activos (máximo: ${this.maxActiveLoans})`,
      );
    }

    // Transacción para evitar race conditions
    const loan = await this.dataSource.transaction(async (manager) => {
      const entity = manager.create(Loan, {
        userId: dto.userId,
        itemId: dto.itemId,
        loanedAt,
        dueAt,
        status: LoanStatus.ACTIVE,
        fineAmount: 0,
      });
      return manager.save(entity);
    });

    return loan;
  }

  async findAll(query: QueryLoansDto): Promise<Loan[]> {
    const where: FindOptionsWhere<Loan> = {};

    if (query.userId) where.userId = query.userId;
    if (query.itemId) where.itemId = query.itemId;
    if (query.status) {
      if (query.status === LoanStatus.OVERDUE) {
        return this.findOverdue(query.userId, query.itemId);
      }
      where.status = query.status;
    }

    return this.loansRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Loan> {
    const loan = await this.loansRepository.findOne({ where: { id } });
    if (!loan) {
      throw new NotFoundException(`Préstamo "${id}" no encontrado`);
    }
    return loan;
  }

  async returnLoan(id: string): Promise<Loan> {
    const loan = await this.findOne(id);

    // R5: estados terminales
    if (loan.status === LoanStatus.RETURNED) {
      throw new BadRequestException('El préstamo ya fue devuelto');
    }
    if (loan.status === LoanStatus.LOST) {
      throw new BadRequestException('El préstamo está marcado como perdido');
    }

    const returnedAt = new Date();

    // R4: calcular multa
    const overdueMs = returnedAt.getTime() - loan.dueAt.getTime();
    const daysOverdue = Math.max(0, Math.ceil(overdueMs / (1000 * 60 * 60 * 24)));
    const fineAmount = Math.round(daysOverdue * this.dailyFineRate * 100) / 100;

    loan.returnedAt = returnedAt;
    loan.status = LoanStatus.RETURNED;
    loan.fineAmount = fineAmount;

    return this.loansRepository.save(loan);
  }

  async markLost(id: string): Promise<Loan> {
    const loan = await this.findOne(id);

    // R5: estados terminales
    if (loan.status === LoanStatus.RETURNED) {
      throw new BadRequestException('El préstamo ya fue devuelto');
    }
    if (loan.status === LoanStatus.LOST) {
      throw new BadRequestException('El préstamo ya está marcado como perdido');
    }

    loan.status = LoanStatus.LOST;
    return this.loansRepository.save(loan);
  }

  private async findOverdue(userId?: string, itemId?: string): Promise<Loan[]> {
    const qb = this.loansRepository
      .createQueryBuilder('loan')
      .where('loan.status = :status', { status: LoanStatus.ACTIVE })
      .andWhere('loan.due_at < :now', { now: new Date() })
      .andWhere('loan.returned_at IS NULL')
      .orderBy('loan.created_at', 'DESC');

    if (userId) {
      qb.andWhere('loan.user_id = :userId', { userId });
    }
    if (itemId) {
      qb.andWhere('loan.item_id = :itemId', { itemId });
    }

    return qb.getMany();
  }
}
