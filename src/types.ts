export interface Student {
  id: string;
  name: string;
  surname: string;
  className: string;
  dateJoined: string;
  startingLevel: string;
  currentLevel: string;
  pictureUrl?: string;
  grandTests?: { name: string; score: number }[];
}

export type ClassName = '5A' | '5B' | '6A' | '6B' | '7A' | '7B' | '8A' | '8B' | string;
