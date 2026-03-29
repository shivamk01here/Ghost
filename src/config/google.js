// ─────────────────────────────────────────────────────────────
// CLIENT IDS:
// • expoClientId   → Web type. Used when running inside Expo Go.
//                    Create at console.cloud.google.com:
//                    Credentials → Create → OAuth 2.0 Client ID
//                    Application type: Web application
//                    Redirect URI: https://auth.expo.io/@YOUR_EXPO_USERNAME/ghost-journal
//
// • androidClientId → Android type. Used in production / dev builds.
//                     (the one already generated with your package name + SHA-1)
//
// • expoUsername    → Your Expo account username (go to expo.dev → see profile URL)
// ─────────────────────────────────────────────────────────────

export const GOOGLE_CONFIG = {
  expoClientId:    '19165369052-4sr0vuhukrgf5sv7helvemllbdtbr91e.apps.googleusercontent.com',
  androidClientId: '19165369052-7f7j1e8njcii2ejnt45ejmd53rd6rn2f.apps.googleusercontent.com',
  iosClientId:     'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  expoUsername:    'shivam01here',
  scopes: [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
};