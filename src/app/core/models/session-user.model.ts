export type SessionRole = 'guest' | 'cliente' | 'admin';

export interface SessionUser {
  id: string;
  nombre: string;
  email: string;
  role: SessionRole;
  token?: string;
}
