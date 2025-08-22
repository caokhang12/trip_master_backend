import { PaginationDto } from '../../shared/dto/page-query.dto';

/**
 * DTO for getting all users with pagination parameters
 * Extends base PaginationDto for consistency
 */
export class GetAllUsersDto extends PaginationDto {
  // Inherits page and limit from PaginationDto
}
