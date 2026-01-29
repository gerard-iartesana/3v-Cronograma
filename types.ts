
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
  realProductionCost?: number;
  realTimeCost?: number;
  projectId?: string; // Link to a project
  recurrence?: RecurrenceConfig;
  masterId?: string; // If this is an expanded instance, this points to the master definition
  notifications?: NotificationConfig[];
  createdBy?: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  createdAt?: string; // ISO format
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
  realProductionCost?: number;
  realTimeCost?: number;
  deadline?: string;
  checklist: ChecklistItem[];
  status: 'ongoing' | 'template' | 'completed';
  createdBy?: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  createdAt?: string;
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
  attachments?: { name: string; mimeType: string; data: string }[];
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string; // e.g., "created_event", "updated_project", "completed_task"
  details: string;
  timestamp: string; // ISO format
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
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
  activityLog?: ActivityLogEntry[];
  knowledgeBase?: string;
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
  knowledgeBaseUpdate?: string;
  documents?: string[];
  deletedDocuments?: string[];
}
