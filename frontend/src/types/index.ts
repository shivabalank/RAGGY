export type DocStatus = 'processing' | 'ready' | 'failed';
export type DocType = 'pdf' | 'docx';

export interface DocumentItem {
  id: string;
  name: string;
  type: DocType;
  size: number;
  uploadedAt: string;
  status: DocStatus;
  pages?: number;  error?: string | null;
}

/** Source chunk metadata the backend returns with each answer. */
export interface Source {
  id: string;
  documentId: string;
  documentName: string;
  page?: number | null;
  section?: string | null;
  snippet: string;
  score?: number | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sources?: Source[];
  error?: boolean;
}

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
}
