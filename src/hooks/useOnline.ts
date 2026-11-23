import { useNetInfo } from '@react-native-community/netinfo';

/**
 * true = conectado, false = sin conexión, null = aún desconocido.
 * Se usa `isConnected` (no `isInternetReachable`) porque en pruebas en red
 * local el servidor puede ser accesible aunque no haya salida a internet.
 */
export function useOnline(): boolean | null {
  const net = useNetInfo();
  return net.isConnected;
}
