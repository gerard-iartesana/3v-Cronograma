
export type AppSection = 'chat' | 'calendar' | 'projects' | 'profile';

export interface NotificationConfig {
  id: string;
  timeBefore: number; // minutes before the event
  unit: 'minutes' | 'hours' | 'days'; // for UI display
  sent: boolean;
}

export interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // default 1
  endDate?: string; // ISO format
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat. Required if frequency='weekly' and specific days needed.
}

export interface MarketingEvent {
  id: string;
  title: string;
  date: string; // ISO format
  endDate?: string; // For campaigns
  type?: 'event' | 'campaign' | 'holiday';
  duration?: string; // e.g., "2 horas", "Todo el día"
  tags: string[];
  assignees?: string[];
  description: string;
  completed: boolean;
  tasks?: ChecklistItem[];
  budgetedValue?: number;
  budgetedCost?: number;
  realValue?: number;
  realCost?: number;
  projectId?: string; // Link to a project
  recurrence?: RecurrenceConfig;
  masterId?: string; // If this is an expanded instance, this points to the master definition
  notifications?: NotificationConfig[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  assignees?: string[];
  globalValue: number; // For backward compatibility
  budgetedValue?: number;
  budgetedCost?: number;
  budgetedHours?: number;
  realValue?: number;
  realCost?: number;
  deadline?: string;
  checklist: ChecklistItem[];
  status: 'ongoing' | 'template' | 'completed';
}

export interface Budget {
  assigned: number;
  estimated: number;
  hourlyRate?: number;
  expenses?: { id: string; title: string; amount: number; }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AppState {
  events: MarketingEvent[];
  projects: Project[];
  budget: Budget;
  chatHistory: ChatMessage[];
  documents: string[]; // List of filenames
  tagColors?: Record<string, string>;
  assigneeColors?: Record<string, string>;
  sentNotifications?: Record<string, boolean>;
  fcmToken?: string;
}

export interface AIStateUpdate {
  message: string;
  newEvents?: MarketingEvent[];
  updatedEvents?: MarketingEvent[];
  deletedEvents?: string[]; // IDs of events to delete
  newProjects?: Project[];
  updatedProjects?: Project[];
  deletedProjects?: string[]; // IDs of projects to delete
  budgetUpdate?: Partial<Budget>;
}
