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
