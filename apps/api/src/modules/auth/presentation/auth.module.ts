import { Module } from '@nestjs/common';

import { AuthService } from '../application/auth.service';
import { RegistrationRepository } from '../infrastructure/registration.repository';
import { UsersRepository } from '../infrastructure/users.repository';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UsersRepository, RegistrationRepository],
  exports: [UsersRepository],
})
export class AuthModule {}
