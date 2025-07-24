import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type PostDocument = Post & Document;

@Schema({
  timestamps: true,
  versionKey: '__v'
})
export class Post {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  // @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  // author: Types.ObjectId | User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  })
  status: string;

  @Prop({ default: 0 })
  views: number;

  // @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  // likes: Types.ObjectId[] | User[];

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  likeIds: Types.ObjectId[];

  @Prop({ default: 1 })
  schemaVersion: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Pre-save middleware for schema versioning
PostSchema.pre('save', function(next) {
  if (this.isNew) {
    this.schemaVersion = 1; // Set initial version for new documents
  }
  next();
});

// Compound index for better query performance
PostSchema.index({ author: 1, status: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ tags: 1 });