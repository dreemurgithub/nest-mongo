import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './users/users.controller';
import { PostController } from './post/post.controller';
import { UserService } from './users/users.service';
import { PostService } from './post/post.service';
import { User, UserSchema } from './schemas/user.schema';
import { Post, PostSchema } from './schemas/post.schema';

@Module({
  imports: [
    // MongoDB connection
    MongooseModule.forRoot('mongodb://localhost:27017/nestjs-app', {
      retryAttempts: 5,
      retryDelay: 1000,
    }),
    
    // Register schemas
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [UserController, PostController],
  providers: [UserService, PostService],
  exports: [UserService, PostService], // Export services for potential use in other modules
})
export class AppModule {}
