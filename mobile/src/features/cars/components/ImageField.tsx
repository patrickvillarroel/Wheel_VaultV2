import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '../../../theme';
import { scanBlister } from '../scanBlister';
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

  const insets = useSafeAreaInsets();
  const [isSheetOpen, setSheetOpen] = useState(false);

  /** Lo que hay que hacer en cuanto la hoja termine de cerrarse (ver `choose`). */
  const pendingAction = useRef<(() => Promise<void>) | null>(null);

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

  /**
   * El escáner no pide permisos aquí: los pide su propia pantalla nativa, que
   * además es la que explica para qué los quiere.
   */
  async function scan() {
    const result = await scanBlister();

    switch (result.status) {
      case 'scanned':
        onPick(result.uri);
        return;

      case 'cancelled':
        return;

      case 'unavailable':
        Alert.alert(
          'Escáner no disponible',
          'Esta versión de la app no incluye el escáner. Toma la foto con la cámara.',
        );
        return;

      case 'error':
        Alert.alert('No se pudo escanear', result.message);
        return;
    }
  }

  /**
   * Cierra la hoja ANTES de abrir la cámara.
   *
   * En iOS, lanzarla con el modal todavía en pantalla falla: el sistema se
   * niega a presentar un controlador sobre otro que ya está presentando. Hay
   * que esperar a que la hoja se vaya del todo, y `onDismiss` avisa justo
   * cuando termina —mejor que un temporizador, que en un móvil lento se queda
   * corto—. En Android el modal es un diálogo y no estorba a la cámara, así
   * que ahí se lanza directo; `onDismiss` tampoco se dispara en Android.
   */
  function choose(action: () => Promise<void>) {
    setSheetOpen(false);

    if (Platform.OS === 'ios') {
      pendingAction.current = action;
    } else {
      void action();
    }
  }

  function runPendingAction() {
    const action = pendingAction.current;
    pendingAction.current = null;
    void action?.();
  }

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => setSheetOpen(true)}
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

      {/*
        Una hoja y no un `Alert`: son tres orígenes, y Android solo admite tres
        botones por diálogo contando el de cancelar. Además aquí cabe explicar
        para qué sirve cada uno, que con el escáner hace falta.
      */}
      <Modal
        visible={isSheetOpen}
        transparent
        animationType="slide"
        // El botón atrás de Android tiene que cerrarla.
        onRequestClose={() => setSheetOpen(false)}
        // Solo iOS. Ver `choose`.
        onDismiss={runPendingAction}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSheetOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          />

          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.sheetTitle}>Foto del carrito</Text>

            <SourceOption
              icon="scan-outline"
              title="Escanear blister"
              hint="Detecta el cartón, lo endereza y lo recorta"
              onPress={() => choose(scan)}
            />
            <SourceOption
              icon="camera-outline"
              title="Tomar foto"
              hint="Para carritos sueltos o fuera del blister"
              onPress={() => choose(() => pickImage('camera'))}
            />
            <SourceOption
              icon="images-outline"
              title="Elegir de la galería"
              hint="Una foto que ya tengas en el móvil"
              onPress={() => choose(() => pickImage('library'))}
            />

            <Pressable
              onPress={() => setSheetOpen(false)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SourceOption({
  icon,
  title,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
    >
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={22} color={colors.red} />
      </View>

      <View style={styles.optionTexts}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionHint}>{hint}</Text>
      </View>
    </Pressable>
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
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
  },
  optionPressed: {
    backgroundColor: colors.border,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.redSoft,
  },
  optionTexts: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  optionHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  cancelText: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
});
