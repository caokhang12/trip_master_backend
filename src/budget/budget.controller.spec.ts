import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActivityCategory } from 'src/trip/enum/trip-enum';
import { BudgetService } from 'src/budget/budget.service';
import { BudgetController } from 'src/budget/budget.controller';

describe('BudgetController', () => {
  let controller: BudgetController;
  let service: BudgetService;

  const mockBudget = {
    id: 'budget-1',
    tripId: 'trip-1',
    totalBudget: 1000,
    spentAmount: 0,
    currency: 'VND',
    notifyThreshold: 0.8,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBudgetSummary = {
    tripId: 'trip-1',
    totalBudget: 1000,
    spentAmount: 500,
    remainingBudget: 500,
    percentageUsed: 50,
    currency: 'VND',
    notifyThreshold: 0.8,
    itemCount: 2,
    isThresholdExceeded: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAnalytics = {
    tripId: 'trip-1',
    totalBudget: 1000,
    totalSpent: 600,
    remainingBudget: 400,
    currency: 'VND',
    breakdown: [
      {
        category: ActivityCategory.HOTEL,
        amount: 300,
        itemCount: 1,
        percentageOfTotal: 50,
      },
      {
        category: ActivityCategory.FOOD,
        amount: 300,
        itemCount: 2,
        percentageOfTotal: 50,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetController],
      providers: [
        {
          provide: BudgetService,
          useValue: {
            getByTripId: jest.fn(),
            createBudget: jest.fn(),
            addItem: jest.fn(),
            updateBudget: jest.fn(),
            deleteItem: jest.fn(),
            getBudgetSummary: jest.fn(),
            getBudgetAnalytics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BudgetController>(BudgetController);
    service = module.get<BudgetService>(BudgetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBudget', () => {
    it('should return budget for a trip', async () => {
      jest.spyOn(service, 'getByTripId').mockResolvedValue(mockBudget as any);

      const result = await controller.getBudget('trip-1');

      expect(result.data).toEqual(mockBudget);
      expect(service.getByTripId).toHaveBeenCalledWith('trip-1');
    });
  });

  describe('create', () => {
    it('should create a new budget', async () => {
      const dto = {
        tripId: 'trip-1',
        totalBudget: 1000,
        currency: 'VND',
      };

      jest.spyOn(service, 'createBudget').mockResolvedValue(mockBudget as any);

      const result = await controller.create(dto);

      expect(result.data).toEqual(mockBudget);
      expect(service.createBudget).toHaveBeenCalledWith(dto);
    });

    it('should handle budget already exists error', async () => {
      const dto = {
        tripId: 'trip-1',
        totalBudget: 1000,
      };

      jest
        .spyOn(service, 'createBudget')
        .mockRejectedValue(
          new BadRequestException('Budget already exists for this trip'),
        );

      await expect(controller.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('addItem', () => {
    it('should add item to budget', async () => {
      const dto = {
        tripBudgetId: 'budget-1',
        category: ActivityCategory.FOOD,
        amount: 100,
      };
      const mockItem = {
        id: 'item-1',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'addItem').mockResolvedValue(mockItem as any);

      const result = await controller.addItem(dto);

      expect(result.data).toEqual(mockItem);
      expect(service.addItem).toHaveBeenCalledWith(dto);
    });

    it('should handle amount exceeding budget error', async () => {
      const dto = {
        tripBudgetId: 'budget-1',
        category: ActivityCategory.HOTEL,
        amount: 1500,
      };

      jest
        .spyOn(service, 'addItem')
        .mockRejectedValue(
          new BadRequestException(
            'Cannot add this expense. Adding 1500 would exceed budget',
          ),
        );

      await expect(controller.addItem(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update budget', async () => {
      const dto = {
        totalBudget: 1500,
        notifyThreshold: 0.7,
      };
      const updated = { ...mockBudget, ...dto };

      jest.spyOn(service, 'updateBudget').mockResolvedValue(updated as any);

      const result = await controller.update('budget-1', dto);

      expect(result.data).toEqual(updated);
      expect(service.updateBudget).toHaveBeenCalledWith('budget-1', dto);
    });
  });

  describe('deleteItem', () => {
    it('should delete budget item', async () => {
      jest.spyOn(service, 'deleteItem').mockResolvedValue({ deleted: true });

      const result = await controller.deleteItem('item-1');

      expect(result.data).toEqual({ deleted: true });
      expect(service.deleteItem).toHaveBeenCalledWith('item-1');
    });
  });

  describe('getBudgetSummary', () => {
    it('should return budget summary', async () => {
      jest
        .spyOn(service, 'getBudgetSummary')
        .mockResolvedValue(mockBudgetSummary as any);

      const result = await controller.getBudgetSummary('trip-1');

      expect(result.data).toEqual(mockBudgetSummary);
      expect(service.getBudgetSummary).toHaveBeenCalledWith('trip-1');
    });

    it('should handle budget not found error', async () => {
      jest
        .spyOn(service, 'getBudgetSummary')
        .mockRejectedValue(new NotFoundException('Budget not found'));

      await expect(controller.getBudgetSummary('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBudgetAnalytics', () => {
    it('should return budget analytics', async () => {
      jest
        .spyOn(service, 'getBudgetAnalytics')
        .mockResolvedValue(mockAnalytics as any);

      const result = await controller.getBudgetAnalytics('trip-1');

      expect(result.data).toEqual(mockAnalytics);
      expect(result.data.breakdown).toHaveLength(2);
      expect(service.getBudgetAnalytics).toHaveBeenCalledWith('trip-1');
    });

    it('should handle budget not found error', async () => {
      jest
        .spyOn(service, 'getBudgetAnalytics')
        .mockRejectedValue(new NotFoundException('Budget not found'));

      await expect(
        controller.getBudgetAnalytics('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
