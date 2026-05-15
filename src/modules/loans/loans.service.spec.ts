import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LoansService } from './loans.service';
import { Loan, LoanStatus } from './entities/loan.entity';
import { Item } from '@modules/items/entities/item.entity';
import { User } from '@modules/users/entities/user.entity';
import { CreateLoanDto } from './dto/create-loan.dto';

describe('LoansService', () => {
  let service: LoansService;
  let loansRepo: jest.Mocked<Repository<Loan>>;
  let itemsRepo: jest.Mocked<Repository<Item>>;
  let usersRepo: jest.Mocked<Repository<User>>;
  let dataSource: { transaction: jest.Mock };

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const itemId = '660e8400-e29b-41d4-a716-446655440001';

  const mockUser = { id: userId, isActive: true } as User;
  const mockItem = { id: itemId, isActive: true } as Item;

  beforeEach(async () => {
    const repoFactory = () => ({
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        {
          provide: getRepositoryToken(Loan),
          useFactory: repoFactory,
        },
        {
          provide: getRepositoryToken(Item),
          useFactory: repoFactory,
        },
        {
          provide: getRepositoryToken(User),
          useFactory: repoFactory,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: number) => {
              const map: Record<string, number> = {
                'loans.maxLoanDays': 30,
                'loans.maxActivePerUser': 3,
                'loans.dailyFineRate': 0.5,
              };
              return map[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
    loansRepo = module.get(getRepositoryToken(Loan));
    itemsRepo = module.get(getRepositoryToken(Item));
    usersRepo = module.get(getRepositoryToken(User));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('crea préstamo exitoso cuando todas las condiciones se cumplen', async () => {
      const now = new Date('2026-05-15T12:00:00.000Z');
      jest.useFakeTimers({ doNotFake: ['setInterval', 'clearInterval'] });
      jest.setSystemTime(now);

      const dueAt = new Date('2026-05-30T12:00:00.000Z');
      const dto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: dueAt.toISOString(),
      };

      usersRepo.findOne.mockResolvedValue(mockUser);
      itemsRepo.findOne.mockResolvedValue(mockItem);
      loansRepo.findOne.mockResolvedValue(null);
      loansRepo.count.mockResolvedValue(0);

      const savedLoan: Partial<Loan> = {
        id: 'loan-uuid',
        userId,
        itemId,
        loanedAt: now,
        dueAt,
        status: LoanStatus.ACTIVE,
        fineAmount: 0,
      };
      dataSource.transaction.mockImplementation(
        async (cb: (mgr: { create: jest.Mock; save: jest.Mock }) => Promise<Loan>) => {
          const manager = {
            create: jest.fn().mockReturnValue(savedLoan),
            save: jest.fn().mockResolvedValue(savedLoan),
          };
          return cb(manager);
        },
      );

      const result = await service.create(dto);

      expect(result.status).toBe(LoanStatus.ACTIVE);
      expect(result.fineAmount).toBe(0);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      const manager = dataSource.transaction.mock.calls[0][0];
      expect(manager).toBeDefined();
    });

    it('lanza ConflictException si item ya tiene préstamo active', async () => {
      const now = new Date('2026-05-15T12:00:00.000Z');
      jest.useFakeTimers({ doNotFake: ['setInterval', 'clearInterval'] });
      jest.setSystemTime(now);

      const dueAt = new Date('2026-05-30T12:00:00.000Z');
      const dto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: dueAt.toISOString(),
      };

      usersRepo.findOne.mockResolvedValue(mockUser);
      itemsRepo.findOne.mockResolvedValue(mockItem);

      const blockingLoan = { id: 'blocking-loan-id' } as Loan;
      loansRepo.findOne.mockResolvedValue(blockingLoan);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow('blocking-loan-id');
    });

    it('lanza ConflictException si usuario ya tiene 3 préstamos active/overdue', async () => {
      const now = new Date('2026-05-15T12:00:00.000Z');
      jest.useFakeTimers({ doNotFake: ['setInterval', 'clearInterval'] });
      jest.setSystemTime(now);

      const dueAt = new Date('2026-05-30T12:00:00.000Z');
      const dto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: dueAt.toISOString(),
      };

      usersRepo.findOne.mockResolvedValue(mockUser);
      itemsRepo.findOne.mockResolvedValue(mockItem);
      loansRepo.findOne.mockResolvedValue(null);
      loansRepo.count.mockResolvedValue(3);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow('3 préstamos activos');
    });
  });

  describe('returnLoan', () => {
    it('calcula multa correctamente: 5 días overdue * 0.50 = 2.50', async () => {
      const returnTime = new Date('2026-06-05T12:00:00.000Z');
      jest.useFakeTimers({ doNotFake: ['setInterval', 'clearInterval'] });
      jest.setSystemTime(returnTime);

      const loan: Partial<Loan> = {
        id: 'loan-id',
        userId,
        itemId,
        loanedAt: new Date('2026-05-15T12:00:00.000Z'),
        dueAt: new Date('2026-05-31T12:00:00.000Z'),
        returnedAt: null,
        status: LoanStatus.ACTIVE,
        fineAmount: 0,
      };

      loansRepo.findOne.mockResolvedValue(loan as Loan);
      loansRepo.save.mockImplementation(async (l: Loan) => l);

      const result = await service.returnLoan('loan-id');

      expect(result.status).toBe(LoanStatus.RETURNED);
      expect(result.fineAmount).toBe(2.5);
      expect(result.returnedAt).toBeDefined();
    });
  });
});
