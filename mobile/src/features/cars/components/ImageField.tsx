import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../../theme';
import { useCarImageUrl } from '../useCarImage';

/**
 * Selector de la foto del auto.
 *
 * Muestra, por este orden: la foto recién elegida (que todavía no se ha
 * subido), la que ya tiene el auto, o el marcador para añadir una.
 */
export function ImageField({
  localUri,
  existingPath,
  onPick,
  onClear,
}: {
  localUri: string | null;
  existingPath: string | null;
  onPick: (uri: string) => void;
  onClear: () => void;
}) {
  const { data: existingUrl } = useCarImageUrl(localUri ? null : existingPath);
  const preview = localUri ?? existingUrl ?? null;

  async function pickImage(source: 'library' | 'camera') {
    // Se piden permisos en el momento de usarlos, no al arrancar: así el
    // sistema explica para qué son y el usuario entiende la pregunta.
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permiso necesario',
        source === 'camera'
          ? 'Activa el acceso a la cámara en los ajustes para tomar una foto.'
          : 'Activa el acceso a tus fotos en los ajustes para elegir una imagen.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: true, aspect: [4, 3] })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
            allowsEditing: true,
            aspect: [4, 3],
          });

    // La compresión se hace justo antes de subir, no aquí: así se recorta
    // sobre la imagen original y no sobre una ya degradada.
    if (!result.canceled && result.assets[0]) {
      onPick(result.assets[0].uri);
    }
  }

  function chooseSource() {
    Alert.alert('Foto del carrito', '¿De dónde quieres tomarla?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cámara', onPress: () => void pickImage('camera') },
      { text: 'Galería', onPress: () => void pickImage('library') },
    ]);
  }

  return (
    <View style={styles.root}>
      <Pressable
        onPress={chooseSource}
        accessibilityRole="button"
        accessibilityLabel={preview ? 'Cambiar la foto del carrito' : 'Añadir una foto del carrito'}
        style={({ pressed }) => [styles.frame, pressed && styles.pressed]}
      >
        {preview ? (
          <Image
            source={{ uri: preview }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
            <Text style={styles.placeholderText}>Añadir foto</Text>
          </View>
        )}
      </Pressable>

      {preview ? (
        <Pressable
          onPress={onClear}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel="Quitar la foto"
          style={styles.remove}
        >
          <Ionicons name="close" size={18} color={colors.textPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  frame: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  pressed: {
    opacity: 0.8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  placeholderText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  remove: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
});
