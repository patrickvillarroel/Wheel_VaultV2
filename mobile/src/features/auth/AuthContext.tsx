import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';

interface AuthState {
  session: Session | null;
  /**
   * `true` mientras se restaura la sesión guardada al arrancar. El gate de
   * rutas lo usa para no mandar al login a alguien que SI tiene sesión: sin
   * esto se vería un parpadeo login -> home en cada arranque.
   */
  isRestoring: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    /**
     * Si Supabase no responde —sin red, servicio caido, URL mal configurada—,
     * `getSession()` puede no resolver nunca y la app se quedaría en el splash
     * para siempre. Pasado este tiempo dejamos de esperar y mostramos el login.
     *
     * No se cancela la promesa: si llega después, `setSession` se aplica igual
     * y el gate lleva a la Home. Peor caso, el usuario ve el login un instante.
     */
    const restoreTimeout = setTimeout(() => {
      if (active) setIsRestoring(false);
    }, 5000);

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      clearTimeout(restoreTimeout);
      setSession(data.session);
      setIsRestoring(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      // Al cerrar sesión se vacía el cache por completo. Sin esto, el siguiente
      // usuario que entre en este dispositivo vería por un instante la
      // colección del anterior.
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      clearTimeout(restoreTimeout);
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({ session, isRestoring, isAuthenticated: session !== null }),
    [session, isRestoring],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }

  return context;
}
