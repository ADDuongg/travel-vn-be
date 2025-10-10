export class CreateUserDto {
  username: string;
  password: string;
  age: number;
  email: string;
  role: 'user' | 'admin';
}
