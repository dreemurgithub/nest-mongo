import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';

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
  ) {}

  async create(createPostDto: CreatePostDto): Promise<PostDocument> {
    const { authorId, ...postData } = createPostDto;
    
    const createdPost = new this.postModel({
      ...postData,
      author: new Types.ObjectId(authorId),
    });

    const savedPost = await createdPost.save();
    
    // Return populated post
    return this.postModel
      .findById(savedPost._id)
      .populate('author', 'name email role')
      .exec();
  }

  async findAll(): Promise<PostDocument[]> {
    return this.postModel
      .find({ status: { $ne: 'archived' } })
      .populate('author', 'name email role')
      .populate('likes', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<PostDocument> {
    const post = await this.postModel
      .findById(id)
      .populate('author', 'name email role createdAt')
      .populate('likes', 'name email')
      .exec();

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async findByAuthor(authorId: string): Promise<PostDocument[]> {
    return this.postModel
      .find({ author: authorId })
      .populate('author', 'name email')
      .populate('likes', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findPublished(page: number = 1, limit: number = 10): Promise<{
    posts: PostDocument[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;
    
    const [posts, total] = await Promise.all([
      this.postModel
        .find({ status: 'published' })
        .populate('author', 'name email role')
        .populate('likes', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments({ status: 'published' })
    ]);

    return {
      posts,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  async update(id: string, updatePostDto: UpdatePostDto, userId: string): Promise<PostDocument> {
    const post = await this.findById(id);
    
    // Check if user is the author or has admin role
    const author = post.author as any;
    if (author._id.toString() !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(
        id,
        { 
          ...updatePostDto,
          $inc: { schemaVersion: 1 }
        },
        { new: true, runValidators: true }
      )
      .populate('author', 'name email role')
      .populate('likes', 'name email')
      .exec();

    return updatedPost;
  }

  async delete(id: string, userId: string): Promise<void> {
    const post = await this.findById(id);
    
    const author = post.author as any;
    if (author._id.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postModel.findByIdAndDelete(id).exec();
  }

  async incrementViews(id: string): Promise<PostDocument> {
    const post = await this.postModel
      .findByIdAndUpdate(
        id,
        { $inc: { views: 1 } },
        { new: true }
      )
      .populate('author', 'name email role')
      .exec();

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async toggleLike(postId: string, userId: string): Promise<PostDocument> {
    const userObjectId = new Types.ObjectId(userId);
    
    const post = await this.postModel.findById(postId).exec();
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    const hasLiked = post.likes.some(like => 
      like.toString() === userObjectId.toString()
    );

    let updatedPost;
    if (hasLiked) {
      // Unlike
      updatedPost = await this.postModel
        .findByIdAndUpdate(
          postId,
          { $pull: { likes: userObjectId } },
          { new: true }
        )
        .populate('author', 'name email role')
        .populate('likes', 'name email')
        .exec();
    } else {
      // Like
      updatedPost = await this.postModel
        .findByIdAndUpdate(
          postId,
          { $addToSet: { likes: userObjectId } },
          { new: true }
        )
        .populate('author', 'name email role')
        .populate('likes', 'name email')
        .exec();
    }

    return updatedPost;
  }

  async searchByTags(tags: string[]): Promise<PostDocument[]> {
    return this.postModel
      .find({
        tags: { $in: tags },
        status: 'published'
      })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPostsByStatus(status: string): Promise<PostDocument[]> {
    return this.postModel
      .find({ status })
      .populate('author', 'name email role')
      .populate('likes', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }
}