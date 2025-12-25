
export interface PromptItem {
  id: string | number;
  title: string;
  tags: string[]; // Changed from category: string
  json: string;
  imageUrl: string;
  author: string;
  authorUrl?: string;
  createdAt: string;
}

export enum ViewMode {
  EXPLORE = 'explore',
  CREATE = 'create',
  SHOWCASE = 'showcase',
  SUBMIT = 'submit'
}

export interface GenerationState {
  loading: boolean;
  error: string | null;
  resultUrl: string | null;
}
