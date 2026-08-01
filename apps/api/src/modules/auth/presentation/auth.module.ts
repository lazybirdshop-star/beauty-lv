import { Module } from '@nestjs/common';

import { AuthService } from '../application/auth.service';
import { UsersRepository } from '../infrastructure/users.repository';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UsersRepository],
  exports: [UsersRepository],
})
export class AuthModule {}
