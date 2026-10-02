import type { UpdateProfileInput } from '@wheel-vault/shared';
import { api } from '../../lib/apiClient';

export interface Profile {
  id: string;
  display_name: string;
  avatar_path: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Me {
  user: {
    id: string;
    email: string | null;
  };
  profile: Profile;
}

/** Identidad + perfil en una sola llamada (ver docs/api.md). */
export function getMe(): Promise<Me> {
  return api.get<Me>('/me');
}

export function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  return api.patch<Profile>('/profile', input);
}
