import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors, spacing, typography } from '../../theme';

/**
 * Tres pestañas en el MVP: Inicio, Colección y Mas.
 *
 * El diseño tiene cinco (añade Buscar y Favoritos), pero esas dos todavia no
 * tienen contenido. Mostrar una pestaña vacía se siente como una app rota;
 * entran cuando funcionen. `cars.is_favorite` ya existe en la base de datos,
 * así que añadirlas no requerira ninguna migración.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: spacing.xs,
          height: 64,
        },
        tabBarLabelStyle: typography.label,
        sceneStyle: { backgroundColor: colors.background },

        /*
         * SIN animacion de pestaña, y es a proposito. No volver a poner
         * `animation: 'shift'` sin leer esto.
         *
         * Con 'shift' la pantalla de Colección se quedaba en negro de vez en
         * cuando al entrar. Las pestañas montan la pantalla la primera vez que
         * se visitan (`lazy`, el valor por omision), asi que con animacion el
         * escenario se monta y se desplaza a la vez: react-native-screens lo
         * tiene separado mientras dura la transicion y a veces no lo vuelve a
         * enganchar, y lo que queda es el fondo de la ventana.
         *
         * El movimiento no se pierde: cada pantalla tiene su propia entrada
         * escalonada, que empieza justo al llegar.
         *
         * Si algun dia se quiere recuperar, el camino es `lazy: false` en estas
         * mismas opciones —para que los escenarios ya esten montados y medidos
         * antes de animar nada— y probarlo en un dispositivo real, no solo en
         * el emulador.
         */
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Colección',
          tabBarIcon: ({ color, size }) => <Ionicons name="car-sport" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Más',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
