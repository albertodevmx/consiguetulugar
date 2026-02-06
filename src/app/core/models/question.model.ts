import { Timestamp } from '@angular/fire/firestore';

export interface QuestionOption {
  text: string;
}

export interface Question {
  id?: string;
  text: string;
  topicId: string;
  options: QuestionOption[];
  correctOption: number;
  imageUrl?: string;
  active: boolean;
  createdAt: Timestamp;
}
