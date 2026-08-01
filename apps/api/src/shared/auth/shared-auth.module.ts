import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import type { Env } from '../../config/env.validation';

/**
 * Global JWT configuration so any feature module can inject `JwtService`
 * and use `JwtAuthGuard`/`RolesGuard` without re-registering `JwtModule`.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        // Dev-mode simplification: one long-lived access token, no refresh
        // rotation yet (see TASKS.md A-5).
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class SharedAuthModule {}
