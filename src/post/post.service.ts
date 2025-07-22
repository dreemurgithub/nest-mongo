import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';
import { User, UserDocument } from '../schemas/user.schema';

export interface PopulatedPostResult {
  author: UserDocument | Types.ObjectId;
  likes: UserDocument[] | Types.ObjectId[];
}

type PopulatedPost = PostDocument & Omit<Post, 'author'|'likes'> & PopulatedPostResult;

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

function isUserArray(arr: unknown): arr is UserDocument[] {
  return Array.isArray(arr) && arr.every(isUserDocument);
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
  ) {}

  async create(createPostDto: CreatePostDto): Promise<PostDocument> {
    const { authorId, ...postData } = createPostDto;
    
    const createdPost = new this.postModel({
      ...postData,
      author: new Types.ObjectId(authorId),
    });

    return createdPost.save();
  }

  async findAll(): Promise<PostDocument[]> {
    return this.postModel
      .find({ status: { $ne: 'archived' } })
      .populate('author', 'name email role')
      .populate('likes', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<PopulatedPost> {
    const post = await this.postModel
      .findById(id)
      .populate<{author: UserDocument}>('author', 'name email role createdAt isActive schemaVersion')
      .populate<{likes: UserDocument[]}>('likes', 'name email')
      .exec() as unknown as PopulatedPost | null;

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto, userId: string): Promise<PopulatedPost> {
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
          $inc: { schemaVersion: 1 }
        },
        { new: true, runValidators: true }
      )
      .populate('author', 'name email role isActive schemaVersion')
      .populate('likes', 'name email')
      .exec();

    if (!updatedPost) {
      throw new NotFoundException(`Post with ID ${id} not found after update`);
    }

    return updatedPost as PopulatedPost;
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

  async toggleLike(postId: string, userId: string): Promise<PopulatedPost> {
    const userObjectId = new Types.ObjectId(userId);
    const post = await this.postModel.findById(postId).exec();
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    const hasLiked = isUserArray(post.likes)
      ? post.likes.some(user => (user._id as Types.ObjectId).equals(userObjectId))
      : post.likes.some(likeId => (likeId as Types.ObjectId).equals(userObjectId));

    const updateOperation = hasLiked 
      ? { $pull: { likes: userObjectId } }
      : { $addToSet: { likes: userObjectId } };

    const updatedPost = await this.postModel
      .findByIdAndUpdate(postId, updateOperation, { new: true })
      .populate('author', 'name email role')
      .populate('likes', 'name email')
      .exec();

    if (!updatedPost) {
      throw new NotFoundException(`Post with ID ${postId} not found after update`);
    }

    return updatedPost as PopulatedPost;
  }
}
