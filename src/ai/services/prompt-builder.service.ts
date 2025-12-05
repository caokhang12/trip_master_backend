import { Injectable } from '@nestjs/common';
import { PreviewItineraryDto } from '../dto/preview-itinerary.dto';

@Injectable()
export class PromptBuilderService {
  buildItineraryPrompt(input: PreviewItineraryDto) {
    const {
      destination,
      startDate,
      endDate,
      budget,
      currency,
      travelers,
      preferences,
    } = input;

    const base = [] as string[];
    base.push(
      'Bạn là trợ lý du lịch thông minh chuyên tạo lịch trình chi tiết bằng JSON.',
    );
    base.push(
      'Trả kết quả JSON thuần. Không markdown, không code block, không giải thích. Chỉ trả JSON.',
    );
    base.push(
      'Định dạng yêu cầu: {"days": [...], "totalCost": ..., "currency": "VND"}',
    );

    const params: string[] = [];
    if (destination) params.push(`Destination: ${destination}`);
    if (startDate) params.push(`Start date: ${startDate}`);
    if (endDate) params.push(`End date: ${endDate}`);
    if (budget) params.push(`Budget: ${budget} ${currency ?? 'VND'}`);
    if (travelers) params.push(`Travelers: ${travelers}`);
    if (preferences) {
      if (preferences.travelStyle)
        params.push(`Travel style: ${preferences.travelStyle}`);
      if (preferences.interests && Array.isArray(preferences.interests))
        params.push(`Interests: ${preferences.interests.join(', ')}`);
    }

    base.push('Yêu cầu chi tiết: ' + params.join(' | '));

    base.push(
      'Mỗi ngày (days) phải có: dayNumber (1...N), date (YYYY-MM-DD nếu có), activities: array of { time, title, description, durationMinutes, cost, currency }',
    );
    base.push(
      'Tính tổng chi phí và gán vào totalCost. Sử dụng currency trường hợp cung cấp. Nếu không, mặc định VND.',
    );

    return base.join('\n');
  }
}
