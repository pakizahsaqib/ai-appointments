import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { id: user.id, email: user.email, name: user.name };
  }
}
