import { FCM } from "@capacitor-community/fcm";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { snsService, SNSConfig } from "./sns.service";

export interface FCMToken {
  token: string;
  platform: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NotificationConfig {
  sns?: SNSConfig;
}

class NotificationService {
  private fcm: FCM | null = null;
  private isInitialized: boolean = false;
  private fcmToken: string | null = null;

  constructor() {
    if (Capacitor.isPluginAvailable("FirebaseMessaging")) {
      this.fcm = new FCM();
    }
  }

  /**
   * Initialize the notification service
   * Sets up local notification permissions, FCM, and optionally SNS
   */
  async initialize(config?: NotificationConfig): Promise<void> {
    if (this.isInitialized) {
      console.log("NotificationService already initialized");
      return;
    }

    try {
      // Request permission for local notifications (for when app is in foreground)
      await this.requestLocalNotificationPermission();
      
      // Listen for incoming notifications when app is in foreground
      this.setupForegroundNotificationListener();
      
      // Initialize SNS if config provided
      if (config?.sns) {
        snsService.initialize(config.sns);
        
        // If we have a platform application ARN, register the device
        if (config.sns.platformApplicationArn && this.fcmToken) {
          await this.registerDeviceWithSNS(this.fcmToken, config.sns.platformApplicationArn);
        }
      }
      
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
      this.fcmToken = result.token;
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
      this.fcmToken = null;
      console.log("FCM token deleted");
    } catch (error) {
      console.error("Error deleting FCM token:", error);
    }
  }

  /**
   * Get the cached FCM token
   */
  getCachedFCMToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Register device with SNS for push notifications
   * @param token - FCM or APNS token
   * @param platformApplicationArn - SNS platform application ARN
   */
  async registerDeviceWithSNS(
    token: string,
    platformApplicationArn: string
  ): Promise<string | null> {
    try {
      const endpointArn = await snsService.createPlatformEndpoint(
        token,
        platformApplicationArn
      );
      
      if (endpointArn) {
        console.log("Device registered with SNS:", endpointArn);
      }
      
      return endpointArn;
    } catch (error) {
      console.error("Error registering device with SNS:", error);
      return null;
    }
  }

  /**
   * Subscribe to a FCM topic for receiving notifications
   * @param topic - The topic name (e.g., "party-updates", "news")
   */
  async subscribeToFCMTopic(topic: string): Promise<boolean> {
    if (!this.fcm) {
      console.warn("FCM not available");
      return false;
    }

    try {
      await this.fcm.subscribeToTopic({ topic });
      console.log(`Subscribed to FCM topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Error subscribing to FCM topic ${topic}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from a FCM topic
   * @param topic - The topic name
   */
  async unsubscribeFromFCMTopic(topic: string): Promise<boolean> {
    if (!this.fcm) {
      console.warn("FCM not available");
      return false;
    }

    try {
      await this.fcm.unsubscribeFromTopic({ topic });
      console.log(`Unsubscribed from FCM topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing from FCM topic ${topic}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to an SNS topic
   * @param topicArn - SNS topic ARN
   */
  async subscribeToSNSTopic(topicArn: string): Promise<string | null> {
    if (!this.fcmToken) {
      console.warn("No FCM token available for SNS subscription");
      return null;
    }

    const endpointArn = snsService.getEndpointArn();
    if (!endpointArn) {
      console.warn("Device not registered with SNS");
      return null;
    }

    return await snsService.subscribe(topicArn, "application", endpointArn);
  }

  /**
   * Unsubscribe from an SNS topic
   * @param subscriptionArn - SNS subscription ARN
   */
  async unsubscribeFromSNSTopic(subscriptionArn: string): Promise<boolean> {
    return await snsService.unsubscribe(subscriptionArn);
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
   * Send push notification via SNS
   * @param targetArn - SNS endpoint ARN or topic ARN
   * @param title - Notification title
   * @param body - Notification body
   * @param data - Additional data
   */
  async sendPushViaSNS(
    targetArn: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<string | null> {
    return await snsService.publishMobilePush(targetArn, title, body, data);
  }

  /**
   * Publish message to SNS topic
   * @param topicArn - SNS topic ARN
   * @param message - Message content
   * @param subject - Optional subject
   */
  async publishToSNSTopic(
    topicArn: string,
    message: string,
    subject?: string
  ): Promise<string | null> {
    return await snsService.publish({
      topicArn,
      message,
      subject,
    });
  }

  /**
   * Send SMS via SNS
   * @param phoneNumber - Phone number in E.164 format
   * @param message - Message content
   */
  async sendSMS(phoneNumber: string, message: string): Promise<string | null> {
    return await snsService.sendSMS(phoneNumber, message);
  }

  /**
   * Check if push notifications are available
   */
  isPushAvailable(): boolean {
    return this.fcm !== null;
  }

  /**
   * Check if SNS is available
   */
  isSNSAvailable(): boolean {
    return snsService.isInitialized();
  }
}

export const notificationService = new NotificationService();
export default notificationService;
