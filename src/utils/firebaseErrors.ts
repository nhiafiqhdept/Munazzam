export function getFirebaseErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = error.code || (typeof error === 'string' ? error : '');
  const message = error.message || String(error);

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in your Firebase Console. Please sign in with Google or enable Email/Password under Authentication > Sign-in method in Firebase Console.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please log in or use a different email.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please try again later.';
    case 'permission-denied':
      return "You don't have permission to access this account.";
    default:
      if (message.includes('operation-not-allowed')) {
        return 'Email/Password sign-in is not enabled in your Firebase Console. Please sign in with Google or enable Email/Password under Authentication > Sign-in method in Firebase Console.';
      }
      if (message.includes('email-already-in-use')) {
        return 'An account with this email already exists.';
      }
      if (message.includes('invalid-credential') || message.includes('user-not-found') || message.includes('wrong-password')) {
        return 'Incorrect email or password.';
      }
      if (message.includes('invalid-email')) {
        return 'Please enter a valid email address.';
      }
      if (message.includes('weak-password')) {
        return 'Password is too weak. Please use at least 6 characters.';
      }
      return error.message || 'Something went wrong. Please try again.';
  }
}

export default getFirebaseErrorMessage;
