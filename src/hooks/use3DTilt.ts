/**
 * use3DTilt — Returns static shared values (expo-sensors not installed).
 * HolographicCard will render without gyroscope tilt effect.
 */
import { useSharedValue } from 'react-native-reanimated';

interface Use3DTiltOptions {
    maxTilt?: number;
    sensitivity?: number;
    enabled?: boolean;
}

export function use3DTilt(_options: Use3DTiltOptions = {}) {
    const rotateX = useSharedValue(0);
    const rotateY = useSharedValue(0);
    return { rotateX, rotateY };
}
