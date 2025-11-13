export enum ActivityCategory {
  FLIGHT = 'flight',
  HOTEL = 'hotel',
  TRANSPORT = 'transport',
  SIGHTSEEING = 'sightseeing', // Tham quan
  CULTURAL = 'cultural', // Văn hóa
  ADVENTURE = 'adventure', // Phiêu lưu
  FOOD = 'food', // Ẩm thực
  SHOPPING = 'shopping', // Mua sắm
  RELAXATION = 'relaxation', // Nghỉ dưỡng
  NIGHTLIFE = 'nightlife', // Cuộc sống về đêm
  NATURE = 'nature', // Thiên nhiên
  HISTORICAL = 'historical', // Lịch sử
  RELIGIOUS = 'religious', // Tôn giáo
  ENTERTAINMENT = 'entertainment', // Giải trí (rạp phim, công viên...)
  FESTIVAL = 'festival', // Lễ hội
  SPORT = 'sport', // Thể thao (trượt tuyết, lặn biển...)
  OTHER = 'other', // Khác
}

export enum TripStatus {
  PLANNING = 'planning',
  BOOKED = 'booked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
