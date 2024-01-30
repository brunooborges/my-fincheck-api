import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { UsersRepository } from 'src/shared/database/repositories/users.repositories';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  getUserById(userId: string) {
    return this.usersRepo.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  async update(userId: string, updateUserDto: UpdateUserDto) {
    const { name, password, newEmail, newPassword } = updateUserDto;

    let hashedPassword: string;

    if (newPassword) {
      hashedPassword = await hash(newPassword, 12);
    }

    if (newEmail) {
      const emailTaken = await this.usersRepo.findUnique({
        where: { email: newEmail },
        select: { id: true },
      });

      if (emailTaken) {
        throw new ConflictException(`This email is already in use`);
      }
    }

    const user = await this.usersRepo.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password!');
    }

    const { email: updatedEmail, name: updatedName } =
      await this.usersRepo.update({
        where: { id: userId },
        data: {
          name,
          email: newEmail ? newEmail : user.email,
          password: newPassword ? hashedPassword : user.password,
        },
      });

    return { updatedEmail, updatedName };
  }

  async delete(userId: string) {
    await this.usersRepo.delete({
      where: { id: userId },
    });

    return null;
  }
}
