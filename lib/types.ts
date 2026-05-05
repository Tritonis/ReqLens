export type DocumentStatus = 'pending' | 'processing' | 'done' | 'error';
export type RequirementType = 'functional' | 'non-functional' | 'constraint' | 'ambiguous';
export type Priority = 'high' | 'medium' | 'low';
export type RequirementStatus = 'open' | 'reviewed' | 'exported' | 'rejected';

export interface Document {
  id: string;
  user_id: string;
  name: string;
  source_type: 'pdf' | 'docx' | 'txt' | 'md' | 'xlsx' | 'paste';
  storage_path: string | null;
  status: DocumentStatus;
  error_msg: string | null;
  page_count: number | null;
  req_count: number;
  created_at: string;
  updated_at: string;
}

export interface Requirement {
  id: string;
  document_id: string;
  user_id: string;
  req_id: string;
  text: string;
  source_quote: string | null;
  source_page: number | null;
  type: RequirementType;
  category: string | null;
  priority: Priority;
  confidence: number;
  is_ambiguous: boolean;
  notes: string | null;
  status: RequirementStatus;
  created_at: string;
}

export interface ExtractionOptions {
  functional: boolean;
  nonFunctional: boolean;
  constraints: boolean;
}

export interface ExtractionResult {
  requirements: ExtractedRequirement[];
  summary: string;
}

export interface ExtractedRequirement {
  text: string;
  source_quote: string | null;
  source_page: number | null;
  type: RequirementType;
  category: string | null;
  priority: Priority;
  confidence: number;
  is_ambiguous: boolean;
  ambiguity_reason: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  email: string;
  can_upload: boolean;
  can_review: boolean;
  can_export: boolean;
  can_manage_users: boolean;
  joined_at: string;
}

export interface OrgWithMember extends Organization {
  member: Pick<OrgMember, 'can_upload' | 'can_review' | 'can_export' | 'can_manage_users'>;
}

export interface OrgInvitation {
  id: string;
  org_id: string;
  email: string;
  can_upload: boolean;
  can_review: boolean;
  can_export: boolean;
  can_manage_users: boolean;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface RequirementAssignment {
  id: string;
  requirement_id: string;
  assignee_id: string;
  email: string;
  assigned_by: string;
  assigned_at: string;
}
