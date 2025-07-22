import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Post } from '../schemas/post.schema';

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
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel
      .find({ isActive: true })
      .populate('posts', 'title content status createdAt')
      .exec();
  }

  async findById(id: string): Promise<UserDocument> {
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

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .populate('posts')
      .exec();
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

    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
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

    return user;
  }

  async getUsersWithRecentPosts(days: number = 7): Promise<UserDocument[]> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    return this.userModel
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
  }

  async getUserStats(id: string) {
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

    return stats;
  }
}
