import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { RedisService } from '../redis/redis.service';

export interface PopulatedPostResult {
  author: UserDocument | Types.ObjectId;
  likes: UserDocument[] | Types.ObjectId[];
}

type PopulatedPost = PostDocument & PopulatedPostResult;
// type PopulatedPost = PostDocument & Omit<Post, 'author'|'likes'> & PopulatedPostResult;

function isUserDocument(obj: unknown): obj is UserDocument {
  if (!obj || typeof obj !== 'object') return false;
  const user = obj as UserDocument;
  return (
    user._id instanceof Types.ObjectId &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    typeof user.isActive === 'boolean' &&
    typeof user.schemaVersion === 'number'
  );
}

export interface CreatePostDto {
  title: string;
  content: string;
  authorId: string;
  tags?: string[];
  status?: string;
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
  tags?: string[];
  status?: string;
}

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private redisService: RedisService,
  ) {}

  async create(createPostDto: CreatePostDto): Promise<PostDocument> {
    try {
      const { authorId, ...postData } = createPostDto;

      if (!Types.ObjectId.isValid(authorId)) {
        throw new Error('Invalid author ID format');
      }

      const createdPost = new this.postModel({
        ...postData,
        authorId: new Types.ObjectId(authorId),
      });

      await createdPost.save();

      await this.redisService.del('posts:all');

      return createdPost;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async findAll(): Promise<PostDocument[]> {
    const cacheKey = 'posts:all';

    const cachedPosts = await this.redisService.get<PostDocument[]>(cacheKey);
    if (cachedPosts) {
      return cachedPosts;
    }

    const posts = await this.postModel
      .find()
      .populate('author')
      .populate('likes')
      .exec();
    const plainPosts = posts.map((post) => post.toObject());
    await this.redisService.set(cacheKey, plainPosts, 300);
    return posts;
  }

  async findById(id: string): Promise<PopulatedPost> {
    const cacheKey = `post:${id}`;

    const cachedPost = await this.redisService.get<PopulatedPost>(cacheKey);
    if (cachedPost) {
      return cachedPost;
    }

    const post = (await this.postModel
      .findById(id)
      .populate('author', 'name email role createdAt isActive schemaVersion')
      .populate('likes', 'name email')
      .exec()) as unknown as PopulatedPost | null;

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    const plainPost = post.toObject();
    await this.redisService.set(cacheKey, plainPost, 300);
    return post;
  }

  async update(
    id: string,
    updatePostDto: UpdatePostDto,
    userId: string,
  ): Promise<PostDocument> {
    const post = await this.findById(id);

    // Check if user is the author
    const author = post.author;
    if (isUserDocument(author)) {
      if ((author._id as Types.ObjectId).toString() !== userId) {
        throw new ForbiddenException('You can only update your own posts');
      }
    } else {
      const authorId = author as Types.ObjectId;
      if (authorId.toString() !== userId) {
        throw new ForbiddenException('You can only update your own posts');
      }
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(
        id,
        {
          ...updatePostDto,
          $inc: { schemaVersion: 1 },
        },
        { new: true, runValidators: true },
      )
      .populate('author', 'name email role isActive schemaVersion')
      .populate('likes', 'name email')
      .exec();

    if (!updatedPost) {
      throw new NotFoundException(`Post with ID ${id} not found after update`);
    }

    await this.redisService.del(`post:${id}`);
    await this.redisService.del('posts:all');

    return updatedPost;
  }

  async delete(id: string, userId: string): Promise<void> {
    const post = await this.findById(id);

    // Check if user is the author
    const author = post.author;
    if (isUserDocument(author)) {
      if ((author._id as Types.ObjectId).toString() !== userId) {
        throw new ForbiddenException('You can only delete your own posts');
      }
    } else if ((author as Types.ObjectId).toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postModel.findByIdAndDelete(id).exec();
  }

  async toggleLike({
    postId,
    userId,
  }: {
    postId: string;
    userId: string;
  }): Promise<PostDocument | null> {
    const userObjectId = new Types.ObjectId(userId);
    const post = await this.postModel.findById(postId).exec();

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }
    const userLikePost = post.likeIds.indexOf(userObjectId);
    if (userLikePost < 0) {
      post.likeIds.push(userObjectId);
      await post.save();
    } else {
      const newLikeIds = [...post.likeIds];
      newLikeIds.splice(userLikePost, 1);
      post.likeIds = newLikeIds;
      await post.save();
    }
    const newPost = await this.postModel
      .findById(postId)
      .populate('author', 'name email role')
      .populate('likes', 'name email');
    return newPost;
  }
}
