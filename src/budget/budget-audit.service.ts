import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BudgetAuditLogEntity,
  BudgetAuditAction,
} from 'src/schemas/budget-audit-log.entity';

@Injectable()
export class BudgetAuditService {
  private readonly logger = new Logger(BudgetAuditService.name);

  constructor(
    @InjectRepository(BudgetAuditLogEntity)
    private readonly auditLogRepo: Repository<BudgetAuditLogEntity>,
  ) {}

  /**
   * Log a budget action to the audit trail
   */
  async logAction(
    budgetId: string,
    action: BudgetAuditAction,
    previousValue?: Record<string, any>,
    newValue?: Record<string, any>,
    description?: string,
    userId?: string,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepo.create({
        budgetId,
        action,
        previousValue,
        newValue,
        description,
        userId,
      });

      await this.auditLogRepo.save(auditLog);
      this.logger.debug(`Audit log created: ${action} for budget ${budgetId}`);
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
      // Don't throw error - audit logging should not break main functionality
    }
  }

  /**
   * Get audit logs for a specific budget
   */
  async getBudgetAuditLogs(
    budgetId: string,
    limit: number = 50,
  ): Promise<BudgetAuditLogEntity[]> {
    return this.auditLogRepo.find({
      where: { budgetId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get audit logs by action type
   */
  async getAuditLogsByAction(
    budgetId: string,
    action: BudgetAuditAction,
    limit: number = 50,
  ): Promise<BudgetAuditLogEntity[]> {
    return this.auditLogRepo.find({
      where: { budgetId, action },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get audit logs within a date range
   */
  async getAuditLogsByDateRange(
    budgetId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BudgetAuditLogEntity[]> {
    return this.auditLogRepo
      .createQueryBuilder('audit')
      .where('audit.budgetId = :budgetId', { budgetId })
      .andWhere('audit.createdAt >= :startDate', { startDate })
      .andWhere('audit.createdAt <= :endDate', { endDate })
      .orderBy('audit.createdAt', 'DESC')
      .getMany();
  }
}
