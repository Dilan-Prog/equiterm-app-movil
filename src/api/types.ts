/**
 * Tipos del API móvil (Laravel: /api/mobile/v1).
 * Todos los campos se tratan como opcionales/nullable para ser tolerantes
 * a cambios del backend.
 */

export type Permissions = Record<string, string[]>;

export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role?: Role | null;
  is_admin?: boolean;
  permissions?: Permissions | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CustomerRef {
  id?: number;
  name?: string | null;
  company?: string | null;
}

export interface TechnicianRef {
  id?: number;
  name?: string | null;
}

export interface ReportSummary {
  id: number;
  folio?: string | null;
  status?: string | null;
  status_label?: string | null;
  service_date?: string | null;
  customer?: CustomerRef | null;
  technician?: TechnicianRef | null;
  service_type?: string | null;
  is_signed?: boolean | null;
  updated_at?: string | null;
}

export interface ReportImage {
  id: number | string;
  url: string;
  caption?: string | null;
}

export interface ReportDetail extends ReportSummary {
  images?: ReportImage[] | null;
  pdf_url?: string | null;
  // El resto de campos se desconoce: se renderizan de forma genérica.
  [key: string]: unknown;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta?: Partial<PaginationMeta> | null;
}

export interface ServiceItem {
  id: number;
  title?: string | null;
  status?: string | null;
  status_label?: string | null;
  scheduled_at?: string | null;
  customer?: CustomerRef | string | null;
  technician?: TechnicianRef | string | null;
  address?: string | null;
}
