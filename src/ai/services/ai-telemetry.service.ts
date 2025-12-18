import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiRunEntity } from 'src/schemas/ai-run.entity';

@Injectable()
export class AiTelemetryService {
  constructor(
    @InjectRepository(AiRunEntity)
    private readonly repo: Repository<AiRunEntity>,
  ) {}

  async recordRun(patch: Partial<AiRunEntity>): Promise<void> {
    try {
      const entity = this.repo.create(patch);
      await this.repo.save(entity);
    } catch {
      return;
    }
  }

  async listRecent(limit: number): Promise<AiRunEntity[]> {
    const resolvedLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 50;

    return this.repo.find({
      order: { createdAt: 'DESC' },
      take: resolvedLimit,
    });
  }

  async updateLatestByRequestId(
    requestId: string,
    patch: Partial<AiRunEntity>,
  ): Promise<void> {
    if (!requestId) return;

    try {
      const latest = await this.repo.findOne({
        where: { requestId },
        order: { createdAt: 'DESC' },
      });
      if (!latest) return;
      await this.repo.update({ id: latest.id }, patch);
    } catch {
      return;
    }
  }
}
