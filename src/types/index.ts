export interface Player {
  id: string;
  name: string;
  number: string;
}

export type EventType = 'goal' | 'opponent_goal';

export interface MatchEvent {
  type: EventType;
  time: string;
  playerId?: string;
  assistId?: string;
}

export interface Match {
  id: string;
  date: string;
  opponent: string;
  result: 'win' | 'lose' | 'draw';
  scoreMyself: number;
  scoreOpponent: number;
  label?: string;
  durationMinutes: number;
  players: string[];
  events: MatchEvent[];
  createdAt?: any;
}

export interface Settings {
  myTeamName: string;
  defaultDuration: number;
}
