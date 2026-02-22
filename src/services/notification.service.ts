import { FCM } from "@capacitor-community/fcm";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export interface FCMToken {
  token: string;
  platform: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

class NotificationService {
  private fcm: FCM | null = null;
  private isInitialized: boolean = false;

  constructor() {
    if (Capacitor.isPluginAvailable("FirebaseMessaging")) {
      this.fcm = new FCM();
    }
  }

  /**
   * Initialize the notification service
   * Sets up local notification permissions and FCM
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("NotificationService already initialized");
      return;
    }

    try {
      // Request permission for local notifications (for when app is in foreground)
      await this.requestLocalNotificationPermission();
      
      // Listen for incoming notifications when app is in foreground
      this.setupForegroundNotificationListener();
      
      this.isInitialized = true;
      console.log("NotificationService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize NotificationService:", error);
    }
  }

  /**
   * Request permission to show local notifications
   */
  private async requestLocalNotificationPermission(): Promise<boolean> {
    try {
      const result = await LocalNotifications.requestPermissions();
      if (result.display === "granted") {
        console.log("Local notification permission granted");
        return true;
      }
      console.warn("Local notification permission denied");
      return false;
    } catch (error) {
      console.error("Error requesting local notification permission:", error);
      return false;
    }
  }

  /**
   * Request FCM token for push notifications
   * This token should be sent to your backend server
   */
  async getFCMToken(): Promise<string | null> {
    if (!this.fcm) {
      console.warn("FCM not available - make sure @capacitor-community/fcm is installed");
      return null;
    }

    try {
      const result = await this.fcm.getToken();
      console.log("FCM Token:", result.token);
      return result.token;
    } catch (error) {
      console.error("Error getting FCM token:", error);
      return null;
    }
  }

  /**
   * Delete FCM token (e.g., when user logs out)
   */
  async deleteFCMToken(): Promise<void> {
    if (!this.fcm) return;

    try {
      await this.fcm.deleteToken();
      console.log("FCM token deleted");
    } catch (error) {
      console.error("Error deleting FCM token:", error);
    }
  }

  /**
   * Subscribe to a topic for receiving notifications
   * @param topic - The topic name (e.g., "party-updates", "news")
   */
  async subscribeToTopic(topic: string): Promise<boolean> {
    if (!this.fcm) {
      console.warn("FCM not available");
      return false;
    }

    try {
      await this.fcm.subscribeToTopic({ topic });
      console.log(`Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from a topic
   * @param topic - The topic name
   */
  async unsubscribeFromTopic(topic: string): Promise<boolean> {
    if (!this.fcm) {
      console.warn("FCM not available");
      return false;
    }

    try {
      await this.fcm.unsubscribeFromTopic({ topic });
      console.log(`Unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
      return false;
    }
  }

  /**
   * Set up listener for foreground notifications
   * FCM will deliver these when the app is in the foreground
   */
  setupForegroundNotificationListener(): void {
    if (!this.fcm) return;

    this.fcm.onMessageReceived().subscribe(
      (notification) => {
        console.log("Foreground notification received:", notification);
        this.showLocalNotification({
          title: notification.title || "New Notification",
          body: notification.body || "",
          data: notification.data,
        });
      },
      (error) => {
        console.error("Error receiving foreground notification:", error);
      }
    );
  }

  /**
   * Show a local notification
   * Used for foreground FCM notifications or standalone local notifications
   */
  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: payload.title,
            body: payload.body,
            id: Date.now(),
            extra: payload.data,
          },
        ],
      });
    } catch (error) {
      console.error("Error showing local notification:", error);
    }
  }

  /**
   * Check if push notifications are available
   */
  isPushAvailable(): boolean {
    return this.fcm !== null;
  }
}

export const notificationService = new NotificationService();
export default notificationService;