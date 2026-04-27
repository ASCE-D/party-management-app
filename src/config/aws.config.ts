// AWS Configuration
// IMPORTANT: In production, use environment variables or AWS Cognito for credentials
// Never commit real credentials to version control

export interface AWSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  platformApplicationArn?: string; // SNS Platform Application ARN for mobile push
}

export const awsConfig: AWSConfig = {
  region: import.meta.env.VITE_AWS_REGION || "us-east-1",
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || "",
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || "",
  platformApplicationArn: import.meta.env.VITE_SNS_PLATFORM_APPLICATION_ARN || "",
};

// Validate configuration
export const isAWSConfigured = (): boolean => {
  return !!(
    awsConfig.accessKeyId &&
    awsConfig.secretAccessKey &&
    awsConfig.region
  );
};

// For development/testing only - use environment variables in production
export const setAWSConfig = (config: Partial<AWSConfig>): void => {
  Object.assign(awsConfig, config);
};
