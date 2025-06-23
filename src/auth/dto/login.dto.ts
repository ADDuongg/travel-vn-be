// login.schema.ts
import { z } from 'zod';

export const LoginDtoSchema = z.object({
  username: z.string(),
  password: z.string(),
});
