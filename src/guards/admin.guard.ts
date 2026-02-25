import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const roles = user?.roles as string[] | undefined;
    if (!Array.isArray(roles) || !roles.includes('ADMIN')) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
