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
  Catch,
  BadRequestException,
  
} from '@nestjs/common';
import { UserService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto).catch(error => {
      throw new BadRequestException(error);
    });
  }

  @Get()
  async findAll() {
    const users = await this.userService.findAll().catch(error => {
      throw new BadRequestException(error);
    });;
    return(users)
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

    return await this.userService.findByEmail(email).catch(error => {
      throw new BadRequestException(error);
    });;
  }

  @Get('recent-posts')
  async getUsersWithRecentPosts(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days, 10) : 7;
    return await this.userService.getUsersWithRecentPosts(daysNumber).catch(error => {
      throw new BadRequestException(error);
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.userService.findById(id).catch(error => {
      throw new BadRequestException(error);
    });
  }

  @Get(':id/stats')
  async getUserStats(@Param('id') id: string) {
    return await this.userService.getUserStats(id).catch(error => {
      throw new BadRequestException(error);
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.update(id, updateUserDto).catch(error => {
      throw new BadRequestException(error);
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.userService.delete(id).catch(error => {
      throw new BadRequestException(error);
    });
  }

  @Patch(':id/deactivate')
  async softDelete(@Param('id') id: string) {
    return await this.userService.softDelete(id).catch(error => {
      throw new BadRequestException(error);
    });
  }
}