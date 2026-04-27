import SNS from "aws-sdk/clients/sns";
import { Capacitor } from "@capacitor/core";

export interface SNSTopic {
  TopicArn: string;
  DisplayName?: string;
}

export interface SNSSubscription {
  SubscriptionArn: string;
  TopicArn: string;
  Protocol: string;
  Endpoint: string;
}

export interface SNSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  platformApplicationArn?: string; // For mobile push
}

export interface PublishOptions {
  topicArn?: string;
  targetArn?: string; // For direct endpoint publishing
  message: string;
  subject?: string;
  messageAttributes?: Record<string, SNS.MessageAttributeValue>;
}

class SNSService {
  private sns: SNS | null = null;
  private config: SNSConfig | null = null;
  private endpointArn: string | null = null;

  /**
   * Initialize SNS with AWS credentials
   * Note: In production, consider using AWS Cognito for secure credential management
   */
  initialize(config: SNSConfig): void {
    this.config = config;
    this.sns = new SNS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
    console.log("SNS service initialized for region:", config.region);
  }

  /**
   * Check if SNS is initialized
   */
  isInitialized(): boolean {
    return this.sns !== null;
  }

  /**
   * Create a new SNS topic
   * @param name - Topic name
   * @param attributes - Optional topic attributes
   */
  async createTopic(
    name: string,
    attributes?: Record<string, string>
  ): Promise<string | null> {
    if (!this.sns) {
      console.error("SNS not initialized");
      return null;
    }

    try {
      const params: SNS.CreateTopicInput = {
        Name: name,
        Attributes: attributes,
      };

      const result = await this.sns.createTopic(params).promise();
      console.log(`Created SNS topic: ${result.TopicArn}`);
      return result.TopicArn || null;
    } catch (error) {
      console.error("Error creating SNS topic:", error);
      return null;
    }
  }

  /**
   * Delete an SNS topic
   * @param topicArn - Topic ARN to delete
   */
  async deleteTopic(topicArn: string): Promise<boolean> {
    if (!this.sns) {
      console.error("SNS not initialized");
      return false;
    }

    try {
      await this.sns.deleteTopic({ TopicArn: topicArn }).promise();
      console.log(`Deleted SNS topic: ${topicArn}`);
      return true;
    } catch (error) {
      console.error("Error deleting SNS topic:", error);
      return false;
    }
  }

  /**
   * List all SNS topics
   */
  async listTopics(): Promise<SNSTopic[]> {
    if (!this.sns) {
      console.error("SNS not initialized");
      return [];
    }

    try {
      const result = await this.sns.listTopics().promise();
      return (result.Topics || []) as SNSTopic[];
    } catch (error) {
      console.error("Error listing SNS topics:", error);
      return [];
    }
  }

  /**
   * Subscribe an endpoint to a topic
   * @param topicArn - Topic ARN
   * @param protocol - Protocol (e.g., 'application' for mobile push, 'email', 'sms')
   * @param endpoint - Endpoint to subscribe (device token, email, phone number)
   */
  async subscribe(
    topicArn: string,
    protocol: string,
    endpoint: string
  ): Promise<string | null> {
    if (!this.sns) {
      console.error("SNS not initialized");
      return null;
    }

    try {
      const result = await this.sns
        .subscribe({
          TopicArn: topicArn,
          Protocol: protocol,
          Endpoint: endpoint,
        })
        .promise();

      console.log(`Subscribed ${endpoint} to topic ${topicArn}`);
      return result.SubscriptionArn || null;
    } catch (error) {
      console.error("Error subscribing to topic:", error);
      return null;
    }
  }

  /**
   * Unsubscribe from a topic
   * @param subscriptionArn - Subscription ARN
   */
  async unsubscribe(subscriptionArn: string): Promise<boolean> {
    if (!this.sns) {
      console.error("SNS not initialized");
      return false;
    }

    try {
      await this.sns.unsubscribe({ SubscriptionArn: subscriptionArn }).promise();
      console.log(`Unsubscribed: ${subscriptionArn}`);
      return true;
    } catch (error) {
      console.error("Error unsubscribing:", error);
      return false;
    }
  }

  /**
   * List subscriptions for a topic
   * @param topicArn - Topic ARN
   */
  async listSubscriptions(topicArn: string): Promise<SNSSubscription[]> {
    if (!this.sns) {
      console.error("SNS not initialized");
      return [];
    }

    try {
      const result = await this.sns
        .listSubscriptionsByTopic({ TopicArn: topicArn })
        .promise();
      return (result.Subscriptions || []) as SNSSubscription[];
    } catch (error) {
      console.error("Error listing subscriptions:", error);
      return [];
    }
  }

  /**
   * Publish a message to a topic or endpoint
   * @param options - Publish options
   */
  async publish(options: PublishOptions): Promise<string | null> {
    if (!this.sns) {
      console.error("SNS not initialized");
      return null;
    }

    try {
      const params: SNS.PublishInput = {
        Message: options.message,
        Subject: options.subject,
        TopicArn: options.topicArn,
        TargetArn: options.targetArn,
        MessageAttributes: options.messageAttributes,
      };

      const result = await this.sns.publish(params).promise();
      console.log(`Published message: ${result.MessageId}`);
      return result.MessageId || null;
    } catch (error) {
      console.error("Error publishing message:", error);
      return null;
    }
  }

  /**
   * Publish a JSON message for mobile push notifications
   * This sends a properly formatted message for FCM/APNS
   * @param targetArn - Platform endpoint ARN or token
   * @param title - Notification title
   * @param body - Notification body
   * @param data - Additional data payload
   */
  async publishMobilePush(
    targetArn: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<string | null> {
    if (!this.sns) {
      console.error("SNS not initialized");
      return null;
    }

    const platform = Capacitor.getPlatform();

    // Create platform-specific message payloads
    const message: Record<string, object> = {
      default: body, // Fallback message
    };

    if (platform === "android") {
      // FCM payload
      message.GCM = JSON.stringify({
        notification: {
          title,
          body,
          sound: "default",
        },
        data: data || {},
      });
    } else if (platform === "ios") {
      // APNS payload
      message.APNS = JSON.stringify({
        aps: {
          alert: {
            title,
            body,
          },
          sound: "default",
          badge: 1,
        },
        data: data || {},
      });
    }

    try {
      const result = await this.sns
        .publish({
          TargetArn: targetArn,
          Message: JSON.stringify(message),
          MessageStructure: "json",
        })
        .promise();

      console.log(`Published mobile push: ${result.MessageId}`);
      return result.MessageId || null;
    } catch (error) {
      console.error("Error publishing mobile push:", error);
      return null;
    }
  }

  /**
   * Create a platform endpoint for mobile push
   * This registers the device token with SNS
   * @param token - FCM or APNS device token
   * @param platformApplicationArn - Platform application ARN
   */
  async createPlatformEndpoint(
    token: string,
    platformApplicationArn?: string
  ): Promise<string | null> {
    if (!this.sns) {
      console.error("SNS not initialized");
      return null;
    }

    const appArn = platformApplicationArn || this.config?.platformApplicationArn;
    if (!appArn) {
      console.error("Platform application ARN not provided");
      return null;
    }

    try {
      const result = await this.sns
        .createPlatformEndpoint({
          PlatformApplicationArn: appArn,
          Token: token,
        })
        .promise();

      this.endpointArn = result.EndpointArn || null;
      console.log(`Created platform endpoint: ${this.endpointArn}`);
      return this.endpointArn;
    } catch (error) {
      console.error("Error creating platform endpoint:", error);
      return null;
    }
  }

  /**
   * Get the current endpoint ARN
   */
  getEndpointArn(): string | null {
    return this.endpointArn;
  }

  /**
   * Set topic attributes
   * @param topicArn - Topic ARN
   * @param attributeName - Attribute name (e.g., 'DisplayName', 'Policy')
   * @param attributeValue - Attribute value
   */
  async setTopicAttributes(
    topicArn: string,
    attributeName: string,
    attributeValue: string
  ): Promise<boolean> {
    if (!this.sns) {
      console.error("SNS not initialized");
      return false;
    }

    try {
      await this.sns
        .setTopicAttributes({
          TopicArn: topicArn,
          AttributeName: attributeName,
          AttributeValue: attributeValue,
        })
        .promise();

      console.log(`Set topic attribute ${attributeName}`);
      return true;
    } catch (error) {
      console.error("Error setting topic attributes:", error);
      return false;
    }
  }

  /**
   * Send SMS message directly
   * @param phoneNumber - Phone number in E.164 format (e.g., +1234567890)
   * @param message - Message content
   */
  async sendSMS(phoneNumber: string, message: string): Promise<string | null> {
    if (!this.sns) {
      console.error("SNS not initialized");
      return null;
    }

    try {
      const result = await this.sns
        .publish({
          PhoneNumber: phoneNumber,
          Message: message,
        })
        .promise();

      console.log(`Sent SMS: ${result.MessageId}`);
      return result.MessageId || null;
    } catch (error) {
      console.error("Error sending SMS:", error);
      return null;
    }
  }
}

export const snsService = new SNSService();
export default snsService;
