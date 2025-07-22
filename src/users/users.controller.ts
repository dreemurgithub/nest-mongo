import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { UserService, CreateUserDto, UpdateUserDto } from '../services/user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'User created successfully',
      data: user,
    };
  }

  @Get()
  async findAll() {
    const users = await this.userService.findAll();
    return {
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data: users,
      count: users.length,
    };
  }

  @Get('search')
  async findByEmail(@Query('email') email: string) {
    if (!email) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Email query parameter is required',
      };
    }

    const user = await this.userService.findByEmail(email);
    return {
      statusCode: HttpStatus.OK,
      message: user ? 'User found' : 'User not found',
      data: user,
    };
  }

  @Get('recent-posts')
  async getUsersWithRecentPosts(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days, 10) : 7;
    const users = await this.userService.getUsersWithRecentPosts(daysNumber);
    
    return {
      statusCode: HttpStatus.OK,
      message: `Users with posts from the last ${daysNumber} days`,
      data: users,
      count: users.length,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'User retrieved successfully',
      data: user,
    };
  }

  @Get(':id/stats')
  async getUserStats(@Param('id') id: string) {
    const stats = await this.userService.getUserStats(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'User statistics retrieved successfully',
      data: stats,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.userService.update(id, updateUserDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'User updated successfully',
      data: user,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.userService.delete(id);
    return {
      statusCode: HttpStatus.NO_CONTENT,
      message: 'User deleted successfully',
    };
  }

  @Patch(':id/deactivate')
  async softDelete(@Param('id') id: string) {
    const user = await this.userService.softDelete(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'User deactivated successfully',
      data: user,
    };
  }
}