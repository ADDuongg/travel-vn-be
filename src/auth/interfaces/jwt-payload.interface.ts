export interface AccessTokenPayload {
  sub: string;
  username: string;
  roles: string[];
  typ: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti?: string;
  typ: 'refresh';
  iat?: number;
  exp?: number;
}

export interface ResetPasswordPayload {
  sub: string;
  typ: 'reset-password';
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface JwtDecoded {
  exp: number;
}
