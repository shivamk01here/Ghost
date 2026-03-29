import { createAudioPlayer } from 'expo-audio';

export async function createLoopingSound(uri, startTime = 0) {
  try {
    const player = createAudioPlayer(uri);
    player.loop = true;
    player.time = startTime / 1000; // expo-audio uses seconds
    player.play();
    return player;
  } catch (e) {
    console.error('Error creating looping sound:', e);
    return null;
  }
}

export async function stopSound(player) {
  if (player) {
    try {
      player.pause();
      // No explicit unloadAsync needed for simple players, they are released on unmount or replace
    } catch (e) {
      // ignore
    }
  }
}

