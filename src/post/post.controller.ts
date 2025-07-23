import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  create(@Body() createPostDto: CreatePostDto) {
    return this.postService.create(createPostDto);
  }

  @Get()
  findAll() {
    return this.postService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    // For now, using a placeholder userId. In real app, get from JWT token
    const userId = 'placeholder-user-id';
    return this.postService.update(id, updatePostDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // For now, using a placeholder userId. In real app, get from JWT token
    const userId = 'placeholder-user-id';
    return this.postService.delete(id, userId);
  }
}
