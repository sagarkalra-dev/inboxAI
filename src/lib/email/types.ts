export type ProviderId = "gmail" | "microsoft" | "imap";

export type Priority = "critical" | "high" | "medium" | "low";

export interface Contact {
  name?: string;
  email: string;
}

export interface AIEnrichment {
  summary?: string;
  priority?: Priority;
  category?: string;
  draftReply?: string;
}

export interface Email {
  id: string;
  provider: ProviderId;
  accountId: string;
  threadId?: string;
  from: Contact;
  to: Contact[];
  cc?: Contact[];
  subject: string;
  snippet: string;
  body: { text?: string; html?: string };
  date: string;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  ai?: AIEnrichment;
}

export interface DraftEmail {
  accountId: string;
  to: Contact[];
  cc?: Contact[];
  bcc?: Contact[];
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
}

export interface ListOptions {
  accountId: string;
  pageToken?: string;
  limit?: number;
  labelIds?: string[];
}

export type EmailMutation =
  | { type: "archive" }
  | { type: "delete" }
  | { type: "markRead"; value: boolean }
  | { type: "star"; value: boolean }
  | { type: "addLabel"; label: string }
  | { type: "removeLabel"; label: string };

export interface Account {
  id: string;
  provider: ProviderId;
  email: string;
  displayName?: string;
  connectedAt: string;
}

export interface AuthResult {
  account: Account;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface EmailProvider {
  id: ProviderId;
  connect(credentials: unknown): Promise<AuthResult>;
  listEmails(options: ListOptions): Promise<Email[]>;
  getEmail(accountId: string, id: string): Promise<Email>;
  sendEmail(draft: DraftEmail): Promise<void>;
  searchEmails(accountId: string, query: string): Promise<Email[]>;
  mutateEmail(accountId: string, id: string, mutation: EmailMutation): Promise<void>;
}
