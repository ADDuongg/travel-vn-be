import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOptionalAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const res = (await super.canActivate(context)) as boolean;
      return res;
    } catch {
      // No/invalid token → treat as anonymous request.
      return true;
    }
  }

  handleRequest(err: unknown, user: any) {
    if (err) return null;
    return user ?? null;
  }
}

