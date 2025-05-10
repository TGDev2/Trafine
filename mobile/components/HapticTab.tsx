import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import type { GestureResponderEvent } from 'react-native';

/**
 
HapticTab : wrapper autour de PlatformPressable pour
ajouter un feedback haptique à l’appui des onglets.
Utilisation de any pour éviter les conflits de typage
avec les versions imbriquées de react-navigation.*/
export function HapticTab(props: any): JSX.Element {
  const { onPressIn, ...rest } = props;

  const handlePressIn = (ev: GestureResponderEvent) => {
    // Soft haptique uniquement sur iOS
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Si onPressIn est bien une fonction, on l’appelle
    if (typeof onPressIn === 'function') {
      onPressIn(ev);
    }
  };

  return <PlatformPressable {...rest} onPressIn={handlePressIn} />;
}