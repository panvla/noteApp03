import { Note } from './note';

export interface CustomHttpResponse {
  timeStamp: Date;
  statusCode: number;
  status: string;
  message: string;
  reason: string;
  developerMessage: string;
  notes?: Note[];
}
