
export interface JobType {
  id: string;
  title: string;
  company?: string;
  location?: string;
  timeText?: string;
  url: string;      
description?: string;       
status: 'ready_to_apply' | 'applied' | 'interviewing' | 'offer' | 'rejected';   
savedAt?: string; // ISO date string
appliedAt?: string; // ISO date string
user_id: string; // User ID 
email: string; // User email
notes?: Array<{
    id: string;
    content: string; // Note content
    createdAt: string; // ISO date string
}>;
}