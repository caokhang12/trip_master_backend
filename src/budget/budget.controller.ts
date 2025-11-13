import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { CreateBudgetItemDto } from './dto/create-item.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { ResponseUtil } from 'src/shared/utils/response.util';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('budget')
@ApiBearerAuth()
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get(':tripId')
  async getBudget(@Param('tripId') tripId: string) {
    const budget = await this.budgetService.getByTripId(tripId);
    return ResponseUtil.success(budget);
  }

  @Post()
  async create(@Body() dto: CreateBudgetDto) {
    const created = await this.budgetService.createBudget(dto);
    return ResponseUtil.success(created);
  }

  @Post('item')
  async addItem(@Body() dto: CreateBudgetItemDto) {
    const item = await this.budgetService.addItem(dto);
    return ResponseUtil.success(item);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    const updated = await this.budgetService.updateBudget(id, dto);
    return ResponseUtil.success(updated);
  }

  @Delete('item/:id')
  async deleteItem(@Param('id') id: string) {
    const result = await this.budgetService.deleteItem(id);
    return ResponseUtil.success(result);
  }
}
