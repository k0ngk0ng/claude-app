/**
 * QR Scanner screen — scans desktop pairing QR codes.
 * No login required — token comes embedded in the QR code.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { relayClient } from '../services/relay';
import type { QRPayload } from '../types';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';

interface Props {
  onPaired: () => void;
  onCancel: () => void;
  showCancel?: boolean;
}

export function QRScannerScreen({ onPaired, onCancel, showCancel = false }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const scanLock = useRef(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Use ref for synchronous lock — React state updates are async
    if (scanLock.current) return;
    scanLock.current = true;
    setScanned(true);
    setProcessing(true);

    try {
      const payload: QRPayload = JSON.parse(data);

      if (!payload.s || !payload.t || !payload.p || !payload.k || !payload.d) {
        throw new Error('Invalid QR code format');
      }

      // Connect + claim pairing in one step
      const success = await relayClient.pairFromQR(payload);

      if (success) {
        // Wait for pairing-accepted event (with timeout)
        const paired = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            unsub();
            resolve(false);
          }, 8000);

          const unsub = relayClient.onEvent((event) => {
            if (event === 'pairing-accepted') {
              clearTimeout(timeout);
              unsub();
              resolve(true);
            }
          });
        });

        if (paired) {
          onPaired();
        } else {
          Alert.alert('Pairing Timeout', 'Desktop did not respond. Make sure the QR code is still valid and try again.');
          setScanned(false);
          scanLock.current = false;
        }
      } else {
        Alert.alert('Pairing Failed', 'Could not connect to relay server. Please try again.');
        setScanned(false);
        scanLock.current = false;
      }
    } catch (err: any) {
      Alert.alert('Invalid QR Code', err.message || 'This QR code is not a valid Claude Studio pairing code.');
      setScanned(false);
      scanLock.current = false;
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permContainer}>
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permText}>
            Camera permission is needed to scan QR codes for pairing with your desktop.
          </Text>
          <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
            <Text style={styles.permButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          {showCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            {showCancel ? (
              <TouchableOpacity onPress={onCancel} style={styles.backButton}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}
            <Text style={styles.topTitle}>Scan QR Code</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Scan frame */}
          <View style={styles.frameContainer}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {processing
                ? 'Connecting & pairing…'
                : 'Point your camera at the QR code\nin Desktop Settings → Remote Control'}
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const FRAME_SIZE = 250;
const CORNER_SIZE = 30;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 60,
  },
  backText: {
    color: colors.white,
    fontSize: fontSize.md,
  },
  topTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: colors.accent,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: colors.accent,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: colors.accent,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  instructions: {
    paddingBottom: 80,
    alignItems: 'center',
  },
  instructionText: {
    color: colors.white,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  permContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    gap: spacing.lg,
  },
  permTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  permText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  permButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxxl,
  },
  permButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing.md,
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
});
