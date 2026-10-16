import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { env } from '../config/env';

/**
 * Cliente de Supabase Auth.
 *
 * Es el ÚNICO sitio de la app que habla con Supabase. Los datos (autos,
 * marcas, perfil) van siempre por la API de Express (ADR-002); aquí solo vive
 * la identidad.
 *
 * El SDK guarda el access token y el refresh token, los rota solo y avisa de
 * los cambios de sesión.
 */

/**
 * Los tokens se guardan en el Keychain (iOS) o el Keystore (Android), no en
 * AsyncStorage: AsyncStorage es texto plano en el sistema de archivos de la
 * app y en un dispositivo con root se lee sin esfuerzo.
 *
 * SecureStore no existe en web, donde cae a localStorage. Es peor, pero la web
 * solo la usamos para desarrollo; las builds reales son nativas.
 */
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Solo tiene sentido en web, donde el token puede volver en la URL.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
