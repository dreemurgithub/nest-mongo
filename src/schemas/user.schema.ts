import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  versionKey: '__v'
})
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ min: 18, max: 120 })
  age?: number;

  @Prop({ 
    type: String, 
    enum: ['user', 'admin', 'moderator'], 
    default: 'user' 
  })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 1 })
  schemaVersion: number;

  // Virtual field for posts
  posts?: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add virtual for posts
UserSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
  justOne: false,
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// Pre-save middleware to handle schema versioning
UserSchema.pre('save', function(next) {
  if (this.isNew) {
    this.schemaVersion = 1; // Set initial version for new documents
  }
  next();
});

// Index for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ isActive: 1, role: 1 });