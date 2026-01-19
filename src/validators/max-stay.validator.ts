import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

export const MAX_STAY_NIGHTS = 30;

@ValidatorConstraint({ name: 'MaxStay', async: false })
export class MaxStayValidator implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const obj = args.object as any;

    const from = new Date(obj.from);
    const to = new Date(obj.to);

    if (!obj.from || !obj.to || isNaN(from.getTime()) || isNaN(to.getTime())) {
      return false;
    }

    const nights = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

    return nights > 0 && nights <= MAX_STAY_NIGHTS;
  }

  defaultMessage() {
    return `Maximum stay is ${MAX_STAY_NIGHTS} nights`;
  }
}
