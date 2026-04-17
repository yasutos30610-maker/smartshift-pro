export type UserRole = "admin" | "area_manager" | "store_manager";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
  assignedStoreIds: string[];
}

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  display_name: string;
  created_at: string;
}

export interface UserStoreAssignmentRow {
  id: string;
  user_id: string;
  store_id: string;
}
