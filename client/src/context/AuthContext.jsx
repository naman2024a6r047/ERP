import { createContext, useState, useContext, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext(null);

// Helper to convert VAPID public key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      API.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Subscribe to push notifications when user changes
  useEffect(() => {
    if (user) {
      subscribeUser();
    }
  }, [user]);

  const subscribeUser = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Browser does not support Web Push notifications.');
      return;
    }

    try {
      // 1. Register Service Worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[SW] Service Worker registered.');
      }

      await navigator.serviceWorker.ready;

      // 2. Request Permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[Push] Permission not granted.');
        return;
      }

      // 3. Fetch VAPID key
      const { data } = await API.get('/notifications/vapid-key');
      if (!data.publicKey) {
        console.warn('[Push] VAPID public key is missing on the server.');
        return;
      }

      // 4. Get or create subscription
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });
      }

      // 5. Send subscription parameters to server
      const subscriptionJson = subscription.toJSON();
      await API.post('/notifications/subscribe', subscriptionJson);
      console.log('[Push] Subscription synchronized with server.');
    } catch (err) {
      console.error('[Push] Failed to register push subscription:', err);
    }
  };

  const unsubscribeUser = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      // Notify backend to remove subscription
      await API.post('/notifications/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {});

      // Local browser unsubscribe
      await subscription.unsubscribe();
      console.log('[Push] Subscriptions cleaned up.');
    } catch (err) {
      console.error('[Push] Failed to unsubscribe:', err);
    }
  };

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await unsubscribeUser();
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);