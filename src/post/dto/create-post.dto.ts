export class CreatePostDto {
  title: string;
  content: string;
  authorId: string;
  tags?: string[];
  status?: string;
}
