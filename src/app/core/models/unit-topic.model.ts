import { Timestamp } from '@angular/fire/firestore';

export interface UnitTopic {
  id?: string;
  unitId: string;
  topicId: string;
  active: boolean;
  createdAt: Timestamp;
}
