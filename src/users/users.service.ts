import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Post } from '../schemas/post.schema';
import { RedisService } from '../redis/redis.service';

type PopulatedPost = {
  _id: Types.ObjectId;
  status?: string;
  views?: number;
  createdAt?: Date;
};

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  age?: number;
  role: string;
  isActive: boolean;
  schemaVersion: number;
  posts: PopulatedPost[];
  createdAt?: Date;
  updatedAt?: Date;
};

export interface CreateUserDto {
  name: string;
  email: string;
  age?: number;
  role?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  age?: number;
  role?: string;
  isActive?: boolean;
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private redisService: RedisService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const createdUser = new this.userModel(createUserDto);
    const savedUser = await createdUser.save();
    
    await this.redisService.del('users:all');
    
    return savedUser;
  }

  async findAll(): Promise<UserDocument[]> {
    const cacheKey = 'users:all';
    
    const cachedUsers = await this.redisService.get<UserDocument[]>(cacheKey);
    if (cachedUsers) {
      return cachedUsers;
    }

    const users = await this.userModel
      .find({ isActive: true })
      .populate('posts', 'title content status createdAt')
      .exec();

    const plainUsers = users.map(user => user.toObject());
    await this.redisService.set(cacheKey, plainUsers, 300);
    return users;
  }

  async findById(id: string): Promise<UserDocument> {
    const cacheKey = `user:${id}`;
    
    const cachedUser = await this.redisService.get<UserDocument>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userModel
      .findById(id)
      .populate({
        path: 'posts',
        select: 'title content status views tags createdAt',
        match: { status: { $ne: 'archived' } },
        options: { sort: { createdAt: -1 } }
      })
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const plainUser = user.toObject();
    await this.redisService.set(cacheKey, plainUser, 300);
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const cacheKey = `user:email:${email.toLowerCase()}`;
    
    const cachedUser = await this.redisService.get<UserDocument | null>(cacheKey);
    if (cachedUser !== undefined) {
      return cachedUser;
    }

    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .populate('posts')
      .exec();

    const plainUser = user ? user.toObject() : null;
    await this.redisService.set(cacheKey, plainUser, 300);
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
        { 
          ...updateUserDto,
          // Increment schema version on update
          $inc: { schemaVersion: 1 }
        },
        { new: true, runValidators: true }
      )
      .populate('posts')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.redisService.del(`user:${id}`);
    await this.redisService.del('users:all');
    if (updateUserDto.email) {
      await this.redisService.del(`user:email:${updateUserDto.email.toLowerCase()}`);
    }
    await this.redisService.del(`user:stats:${id}`);

    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.redisService.del(`user:${id}`);
    await this.redisService.del('users:all');
    await this.redisService.del(`user:email:${result.email.toLowerCase()}`);
    await this.redisService.del(`user:stats:${id}`);
  }

  async softDelete(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { 
          isActive: false,
          $inc: { schemaVersion: 1 }
        },
        { new: true }
      )
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.redisService.del(`user:${id}`);
    await this.redisService.del('users:all');
    await this.redisService.del(`user:email:${user.email.toLowerCase()}`);
    await this.redisService.del(`user:stats:${id}`);

    return user;
  }

  async getUsersWithRecentPosts(days: number = 7): Promise<UserDocument[]> {
    const cacheKey = `users:recent_posts:${days}`;
    
    const cachedUsers = await this.redisService.get<UserDocument[]>(cacheKey);
    if (cachedUsers) {
      return cachedUsers;
    }

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const users = await this.userModel
      .find({ isActive: true })
      .populate({
        path: 'posts',
        match: { 
          createdAt: { $gte: dateThreshold },
          status: 'published'
        },
        select: 'title createdAt views',
        options: { sort: { createdAt: -1 } }
      })
      .exec();

    const plainUsers = users.map(user => user.toObject());
    await this.redisService.set(cacheKey, plainUsers, 300);
    return users;
  }

  async getUserStats(id: string) {
    const cacheKey = `user:stats:${id}`;
    
    const cachedStats = await this.redisService.get(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    const user = await this.userModel
      .findById(id)
      .populate<{posts: PopulatedPost[]}>('posts', 'status views createdAt')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const populatedUser = user as unknown as PopulatedUser;

    const posts = populatedUser.posts || [];
    const stats = {
      totalPosts: posts.length,
      publishedPosts: posts.filter(post => post.status === 'published').length,
      draftPosts: posts.filter(post => post.status === 'draft').length,
      totalViews: posts.reduce((sum, post) => sum + (post.views || 0), 0),
      userInfo: {
        name: populatedUser.name,
        email: populatedUser.email,
        role: populatedUser.role,
        schemaVersion: populatedUser.schemaVersion,
        memberSince: populatedUser.createdAt
      }
    };

    await this.redisService.set(cacheKey, stats, 300);
    return stats;
  }
}
