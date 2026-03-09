import { Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const logger = new Logger('HTTP');

export function loggerMiddleware(req: Request, _res: Response, next: NextFunction) {
  logger.log(`${req.method} ${req.url}`);
  next();
}
