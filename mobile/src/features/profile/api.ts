import { api } from '../../lib/apiClient';

export interface Me {
  user: {
    id: string;
    email: string | null;
  };
  profile: {
    id: string;
    display_name: string;
    avatar_path: string | null;
    bio: string | null;
    created_at: string;
    updated_at: string;
  };
}

/** Identidad + perfil en una sola llamada (ver docs/api.md). */
export function getMe(): Promise<Me> {
  return api.get<Me>('/me');
}
