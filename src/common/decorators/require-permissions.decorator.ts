import { SetMetadata } from '@nestjs/common';

import { RBAC_PERMISSIONS_METADATA_KEY } from 'src/rbac/constants';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(RBAC_PERMISSIONS_METADATA_KEY, permissions);
