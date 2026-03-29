import * as Location from 'expo-location';

export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const loc = await Location.getCurrentPositionAsync({});
    const reverse = await Location.reverseGeocodeAsync({
      latitude:  loc.coords.latitude,
      longitude: loc.coords.longitude,
    });

    const name = reverse[0] 
      ? `${reverse[0].city || reverse[0].region}, ${reverse[0].country}`
      : 'Unknown';

    return {
      name,
      coords: {
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      }
    };
  } catch (e) {
    console.error('Error getting location:', e);
    return null;
  }
}
