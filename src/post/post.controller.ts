import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Catch,
  BadRequestException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  async create(@Body() createPostDto: CreatePostDto) {
    return await this.postService.create(createPostDto).catch((error) => {
      throw new BadRequestException(error);
    });
  }

  @Post('toggleLike')
  async toggleLike(@Body() postLike: { postId: string; userId: string }) {
    return await this.postService.toggleLike(postLike).catch((error) => {
      throw new BadRequestException(error);
    });
  }

  @Get()
  findAll() {
    return this.postService.findAll().catch(error => {
      throw new BadRequestException(error);
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postService.findById(id).catch(error => {
      throw new BadRequestException(error);
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    // For now, using a placeholder userId. In real app, get from JWT token
    const userId = 'placeholder-user-id';
    return this.postService.update(id, updatePostDto, userId).catch(error => {
      throw new BadRequestException(error);
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // For now, using a placeholder userId. In real app, get from JWT token
    const userId = 'placeholder-user-id';
    return this.postService.delete(id, userId).catch(error => {
      throw new BadRequestException(error);
    });
  }
}
