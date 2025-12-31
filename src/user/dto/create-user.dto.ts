export class CreateUserDto {
  username: string;
  password: string;
  age: number;
  email: string;
  roles: string[];
  permissions: {
    routers: string[];
    apis: string[];
  };
}
