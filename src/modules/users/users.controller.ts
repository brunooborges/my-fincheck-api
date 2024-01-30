import { Body, Controller, Delete, Get, Put } from '@nestjs/common';

import { ActiveUserId } from 'src/shared/decorators/ActiveUserId';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  me(@ActiveUserId() userId: string) {
    return this.usersService.getUserById(userId);
  }

  @Put(':userId')
  update(@ActiveUserId() userId: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(userId, updateUserDto);
  }

  @Delete(':userId')
  delete(@ActiveUserId() userId: string) {
    return this.usersService.delete(userId);
  }
}
