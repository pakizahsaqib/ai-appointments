import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto, SignupDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({ ...dto, passwordHash });
    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueToken(user);
  }

  issueToken(user: { id: string; email: string; name: string }) {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '1d') },
    );
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}
