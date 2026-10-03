import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findByEmail(email: string) {
    return this.users.findOne({ where: { email: email.toLowerCase() } });
  }

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  async create(input: { name: string; email: string; passwordHash: string }) {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    return this.users.save(
      this.users.create({
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
      }),
    );
  }
}
