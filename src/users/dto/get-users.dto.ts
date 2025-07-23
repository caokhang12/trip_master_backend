import { PaginationDto } from '../../shared/dto/pagination.dto';

/**
 * DTO for getting all users with pagination parameters
 * Extends base PaginationDto for consistency
 */
export class GetAllUsersDto extends PaginationDto {
  // Inherits page and limit from PaginationDto
}
