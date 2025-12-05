import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TripBudgetEntity } from 'src/schemas/trip-budget.entity';
import { BudgetItemEntity } from 'src/schemas/budget-item.entity';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RedisCacheService } from 'src/redis/redis-cache.service';
import { ActivityCategory } from 'src/trip/enum/trip-enum';
import { BudgetService } from 'src/budget/budget.service';

describe('BudgetService', () => {
  let service: BudgetService;
  let budgetRepository: Repository<TripBudgetEntity>;
  let itemRepository: Repository<BudgetItemEntity>;
  let redisService: RedisCacheService;
  let dataSource: DataSource;

  const mockBudget: Partial<TripBudgetEntity> = {
    id: 'budget-1',
    tripId: 'trip-1',
    totalBudget: 1000,
    spentAmount: 0,
    currency: 'VND',
    notifyThreshold: 0.8,
    items: [],
  };

  const mockItem: Partial<BudgetItemEntity> = {
    id: 'item-1',
    tripBudgetId: 'budget-1',
    category: ActivityCategory.FOOD,
    amount: 100,
    source: 'manual',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        {
          provide: getRepositoryToken(TripBudgetEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BudgetItemEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
    budgetRepository = module.get<Repository<TripBudgetEntity>>(
      getRepositoryToken(TripBudgetEntity),
    );
    itemRepository = module.get<Repository<BudgetItemEntity>>(
      getRepositoryToken(BudgetItemEntity),
    );
    redisService = module.get<RedisCacheService>(RedisCacheService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getByTripId', () => {
    it('should return budget with items for a valid trip', async () => {
      const expectedResult = { ...mockBudget, items: [mockItem] };
      jest
        .spyOn(budgetRepository, 'findOne')
        .mockResolvedValue(expectedResult as TripBudgetEntity);

      const result = await service.getByTripId('trip-1');

      expect(result).toEqual(expectedResult);
      expect(budgetRepository.findOne).toHaveBeenCalledWith({
        where: { tripId: 'trip-1' },
        relations: ['items'],
        order: { createdAt: 'ASC' },
      });
    });

    it('should return null when budget not found', async () => {
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getByTripId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createBudget', () => {
    it('should create a new budget successfully', async () => {
      const dto = {
        tripId: 'trip-1',
        totalBudget: 1000,
        currency: 'VND',
        notifyThreshold: 0.8,
      };
      const savedBudget = { ...mockBudget, ...dto };

      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(budgetRepository, 'create')
        .mockReturnValue(savedBudget as any);
      jest
        .spyOn(budgetRepository, 'save')
        .mockResolvedValue(savedBudget as TripBudgetEntity);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await service.createBudget(dto);

      expect(result).toEqual(savedBudget);
      expect(budgetRepository.create).toHaveBeenCalledWith({
        tripId: 'trip-1',
        totalBudget: 1000,
        currency: 'VND',
        notifyThreshold: 0.8,
        spentAmount: 0,
      });
    });

    it('should throw error if budget already exists', async () => {
      const dto = {
        tripId: 'trip-1',
        totalBudget: 1000,
      };

      jest
        .spyOn(budgetRepository, 'findOne')
        .mockResolvedValue(mockBudget as TripBudgetEntity);

      await expect(service.createBudget(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addItem', () => {
    it('should add item successfully when within budget', () => {
      const dto = {
        tripBudgetId: 'budget-1',
        category: ActivityCategory.FOOD,
        amount: 100,
      };

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({ ...mockItem, ...dto }),
          update: jest.fn(),
        },
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      jest
        .spyOn(budgetRepository, 'findOne')
        .mockResolvedValue(mockBudget as TripBudgetEntity);
      jest
        .spyOn(dataSource, 'createQueryRunner')
        .mockReturnValue(mockQueryRunner as any);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw error when item amount exceeds budget', async () => {
      const dto = {
        tripBudgetId: 'budget-1',
        category: ActivityCategory.HOTEL,
        amount: 1500, // Exceeds 1000 budget
      };

      jest
        .spyOn(budgetRepository, 'findOne')
        .mockResolvedValue(mockBudget as TripBudgetEntity);

      await expect(service.addItem(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when amount is zero or negative', async () => {
      const dto = {
        tripBudgetId: 'budget-1',
        category: ActivityCategory.FOOD,
        amount: 0,
      };

      jest
        .spyOn(budgetRepository, 'findOne')
        .mockResolvedValue(mockBudget as TripBudgetEntity);

      await expect(service.addItem(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when budget not found', async () => {
      const dto = {
        tripBudgetId: 'non-existent',
        category: ActivityCategory.FOOD,
        amount: 100,
      };

      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(null);

      await expect(service.addItem(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBudget', () => {
    it('should update budget successfully', async () => {
      const dto = {
        totalBudget: 1500,
        notifyThreshold: 0.7,
      };
      const updated = { ...mockBudget, ...dto };

      jest
        .spyOn(budgetRepository, 'findOne')
        .mockResolvedValueOnce(mockBudget as TripBudgetEntity)
        .mockResolvedValueOnce(updated as TripBudgetEntity);
      jest
        .spyOn(budgetRepository, 'update')
        .mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await service.updateBudget('budget-1', dto);

      expect(result).toEqual(updated);
      expect(budgetRepository.update).toHaveBeenCalledWith('budget-1', dto);
    });

    it('should throw error when budget not found', async () => {
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.updateBudget('non-existent', { totalBudget: 500 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteItem', () => {
    it('should delete item successfully', async () => {
      jest
        .spyOn(itemRepository, 'findOne')
        .mockResolvedValue(mockItem as BudgetItemEntity);
      jest
        .spyOn(budgetRepository, 'findOne')
        .mockResolvedValue(mockBudget as TripBudgetEntity);
      jest
        .spyOn(itemRepository, 'delete')
        .mockResolvedValue({ affected: 1 } as any);
      jest
        .spyOn(budgetRepository, 'update')
        .mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await service.deleteItem('item-1');

      expect(result).toEqual({ deleted: true });
      expect(itemRepository.delete).toHaveBeenCalledWith('item-1');
    });

    it('should reduce spent amount when deleting item', async () => {
      const spentMockBudget = { ...mockBudget, spentAmount: 100 };
      jest
        .spyOn(itemRepository, 'findOne')
        .mockResolvedValue(mockItem as BudgetItemEntity);
      jest
        .spyOn(budgetRepository, 'findOne')
        .mockResolvedValue(spentMockBudget as TripBudgetEntity);
      jest
        .spyOn(itemRepository, 'delete')
        .mockResolvedValue({ affected: 1 } as any);
      jest
        .spyOn(budgetRepository, 'update')
        .mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      await service.deleteItem('item-1');

      expect(budgetRepository.update).toHaveBeenCalledWith('budget-1', {
        spentAmount: 0, // 100 - 100 = 0
      });
    });

    it('should throw error when item not found', async () => {
      jest.spyOn(itemRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deleteItem('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBudgetSummary', () => {
    it('should return correct budget summary', async () => {
      const budgetWithSpent = {
        ...mockBudget,
        spentAmount: 500,
        items: [
          { ...mockItem, amount: 200 },
          { ...mockItem, id: 'item-2', amount: 300 },
        ],
      };

      jest
        .spyOn(service, 'getByTripId')
        .mockResolvedValue(budgetWithSpent as TripBudgetEntity);

      const result = await service.getBudgetSummary('trip-1');

      expect(result).toMatchObject({
        tripId: 'trip-1',
        totalBudget: 1000,
        spentAmount: 500,
        remainingBudget: 500,
        percentageUsed: 50,
        itemCount: 2,
        isThresholdExceeded: false,
      });
    });

    it('should mark threshold as exceeded when spending exceeds threshold', async () => {
      const budgetExceeded = {
        ...mockBudget,
        spentAmount: 850,
        notifyThreshold: 0.8,
      };

      jest
        .spyOn(service, 'getByTripId')
        .mockResolvedValue(budgetExceeded as TripBudgetEntity);

      const result = await service.getBudgetSummary('trip-1');

      expect(result.isThresholdExceeded).toBe(true);
    });

    it('should throw error when budget not found', async () => {
      jest.spyOn(service, 'getByTripId').mockResolvedValue(null);

      await expect(service.getBudgetSummary('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBudgetAnalytics', () => {
    it('should return correct analytics breakdown by category', async () => {
      const budgetWithItems = {
        ...mockBudget,
        spentAmount: 600,
        items: [
          { ...mockItem, category: ActivityCategory.FOOD, amount: 200 },
          { ...mockItem, category: ActivityCategory.FOOD, amount: 100 },
          { ...mockItem, category: ActivityCategory.HOTEL, amount: 300 },
        ],
      };

      jest
        .spyOn(service, 'getByTripId')
        .mockResolvedValue(budgetWithItems as TripBudgetEntity);

      const result = await service.getBudgetAnalytics('trip-1');

      expect(result.totalSpent).toBe(600);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0]).toMatchObject({
        category: ActivityCategory.HOTEL,
        amount: 300,
        itemCount: 1,
        percentageOfTotal: 50,
      });
      expect(result.breakdown[1]).toMatchObject({
        category: ActivityCategory.FOOD,
        amount: 300,
        itemCount: 2,
        percentageOfTotal: 50,
      });
    });

    it('should throw error when budget not found', async () => {
      jest.spyOn(service, 'getByTripId').mockResolvedValue(null);

      await expect(service.getBudgetAnalytics('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
