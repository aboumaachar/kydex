import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  me() {
    return { message: 'Use JWT payload from request context in full implementation.' };
  }
}
