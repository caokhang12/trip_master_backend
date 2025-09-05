import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

function toDateOnlyISO(d: string): Date | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d)) return null;
  const date = new Date(d + 'T00:00:00');
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

@ValidatorConstraint({ name: 'EndAfterStartDate', async: false })
export class EndAfterStartDateConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    // Optional field: if endDate is empty, it's valid here
    if (value == null || value === '') return true;
    const obj = args.object as Record<string, unknown>;
    const start = obj['startDate'] as string | undefined;
    if (typeof value !== 'string' || value.trim() === '') return true;
    const end = value;
    if (!start) return true; // nothing to compare against
    const startD = toDateOnlyISO(start);
    const endD = toDateOnlyISO(end);
    if (!startD || !endD) return true; // format validators handle this
    return endD.getTime() > startD.getTime();
  }

  defaultMessage(): string {
    return 'endDate phải sau startDate (YYYY-MM-DD).';
  }
}
