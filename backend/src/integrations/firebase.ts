import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging, type Message } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { DeviceTokenRepository } from '../repositories/device_token.repository.js';

export interface NotificationPayload {
  title: string;
  body: string;
  arabicTitle?: string;
  arabicBody?: string;
  data?: Record<string, string>;
}

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  skipped?: boolean;
  reason?: string;
  invalidTokens?: string[];
}

export class FirebaseService {
  private static app: App | null = null;
  private static isInitialized = false;

  /**
   * Maximum registration tokens per Firebase multicast batch request.
   * Defined by Firebase Admin SDK specification (sendEachForMulticast limit: 500).
   */
  public static readonly FCM_MULTICAST_LIMIT = 500;

  /**
   * Splits an array of items into chunks of specified maximum size.
   */
  static chunkArray<T>(items: T[], size: number): T[][] {
    if (size <= 0) throw new Error('Chunk size must be positive');
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Safe singleton initialization of Firebase Admin SDK.
   * Reads credentials from FIREBASE_SERVICE_ACCOUNT (JSON string),
   * FIREBASE_SERVICE_ACCOUNT_PATH (file path), or individual env vars.
   */
  static initialize(): boolean {
    if (this.isInitialized && this.app) {
      return true;
    }

    try {
      // Check if Firebase app is already initialized
      const apps = getApps();
      if (apps.length > 0) {
        this.app = apps[0]!;
        this.isInitialized = true;
        return true;
      }

      let credential: ServiceAccount | null = null;

      // 1. JSON string in environment variable (recommended for Heroku / Staging)
      if (env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          credential = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
        } catch {
          logger.warn('[FCM] FIREBASE_SERVICE_ACCOUNT is set but contains invalid JSON.');
        }
      }

      // 2. Local file path in environment variable (for local testing)
      if (!credential && env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        try {
          const resolvedPath = path.resolve(env.FIREBASE_SERVICE_ACCOUNT_PATH);
          if (fs.existsSync(resolvedPath)) {
            const raw = fs.readFileSync(resolvedPath, 'utf8');
            credential = JSON.parse(raw);
          }
        } catch {
          logger.warn(`[FCM] Could not read service account from FIREBASE_SERVICE_ACCOUNT_PATH.`);
        }
      }

      // 3. Fallback to default local service account if present in workspace root
      if (!credential && env.NODE_ENV !== 'production') {
        const localCandidates = [
          path.resolve('decidix-firebase-adminsdk-fbsvc-5845012e6a.json'),
          path.resolve('..', 'decidix-firebase-adminsdk-fbsvc-5845012e6a.json'),
        ];
        for (const candidate of localCandidates) {
          if (fs.existsSync(candidate)) {
            try {
              credential = JSON.parse(fs.readFileSync(candidate, 'utf8'));
              break;
            } catch {
              // Ignore parse errors on fallback candidate
            }
          }
        }
      }

      // 4. Individual environment variables
      if (!credential && env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
        credential = {
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
      }

      if (!credential) {
        logger.info('[FCM] Firebase service account credentials not configured. Push delivery disabled.');
        this.isInitialized = false;
        return false;
      }

      // Normalize snake_case keys and escape sequences in PEM private key
      const rawKey = (credential as any).private_key || credential.privateKey;
      if (typeof rawKey === 'string') {
        const fixedKey = rawKey.replace(/\\n/g, '\n');
        (credential as any).private_key = fixedKey;
        credential.privateKey = fixedKey;
      }
      if ((credential as any).project_id && !credential.projectId) {
        credential.projectId = (credential as any).project_id;
      }
      if ((credential as any).client_email && !credential.clientEmail) {
        credential.clientEmail = (credential as any).client_email;
      }

      this.app = initializeApp({
        credential: cert(credential),
        projectId: credential.projectId || 'decidix',
      });

      this.isInitialized = true;
      logger.info(`[FCM] Firebase Admin SDK initialized successfully for project "${credential.projectId || 'decidix'}".`);
      return true;
    } catch (err: any) {
      logger.warn(`[FCM] Firebase Admin SDK initialization failed: ${err.message}. Running in offline fallback.`);
      this.isInitialized = false;
      this.app = null;
      return false;
    }
  }

  /**
   * Checks whether Firebase Admin is initialized and operational.
   */
  static isReady(): boolean {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.isInitialized && this.app !== null;
  }

  /**
   * Sends a push notification to an individual device token.
   * Cleans up stale/invalid tokens automatically if Firebase rejects them.
   */
  static async sendToDevice(token: string, payload: NotificationPayload): Promise<DeliveryResult> {
    if (!this.isReady()) {
      return {
        success: false,
        skipped: true,
        reason: 'FIREBASE_NOT_CONFIGURED',
      };
    }

    try {
      const message: Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          ...payload.data,
          ...(payload.arabicTitle ? { arabic_title: payload.arabicTitle } : {}),
          ...(payload.arabicBody ? { arabic_body: payload.arabicBody } : {}),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'decidix_alerts',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const messageId = await getMessaging(this.app!).send(message);
      return { success: true, messageId };
    } catch (err: any) {
      const errorCode = err.code || err.errorInfo?.code;
      // Stale or unregistered tokens cleanup
      if (
        errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/registration-token-not-registered'
      ) {
        logger.info(`[FCM] Deactivating unregistered/invalid device token: ${errorCode}`);
        await DeviceTokenRepository.deactivateTokens([token]);
        return {
          success: false,
          reason: errorCode,
          invalidTokens: [token],
        };
      }

      logger.warn(`[FCM] Push notification send error: ${err.message}`);
      return {
        success: false,
        reason: errorCode || err.message,
      };
    }
  }

  /**
   * Sends a multicast push notification to multiple device tokens.
   * Handles Firebase batch limits (max 500 tokens per batch) by chunking.
   * Automatically deactivates unregistered/invalid tokens.
   */
  static async sendMulticast(
    tokens: string[],
    payload: NotificationPayload
  ): Promise<{
    targetedCount: number;
    deliveredCount: number;
    failedCount: number;
    invalidTokens: string[];
    skipped?: boolean;
    reason?: string;
  }> {
    const uniqueTokens = Array.from(new Set(tokens.filter((t) => t && t.trim().length > 0)));
    if (uniqueTokens.length === 0) {
      return { targetedCount: 0, deliveredCount: 0, failedCount: 0, invalidTokens: [] };
    }

    if (!this.isReady()) {
      return {
        targetedCount: uniqueTokens.length,
        deliveredCount: 0,
        failedCount: 0,
        invalidTokens: [],
        skipped: true,
        reason: 'FIREBASE_NOT_CONFIGURED',
      };
    }

    const tokenChunks = this.chunkArray(uniqueTokens, this.FCM_MULTICAST_LIMIT);
    let totalDelivered = 0;
    let totalFailed = 0;
    const allInvalidTokens: string[] = [];

    for (const chunk of tokenChunks) {
      try {
        const multicastMessage: any = {
          tokens: chunk,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            ...payload.data,
            ...(payload.arabicTitle ? { arabic_title: payload.arabicTitle } : {}),
            ...(payload.arabicBody ? { arabic_body: payload.arabicBody } : {}),
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'decidix_alerts',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              defaultSound: true,
            },
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: payload.title,
                  body: payload.body,
                },
                sound: 'default',
                badge: 1,
              },
            },
          },
        };

        const batchResponse = await getMessaging(this.app!).sendEachForMulticast(multicastMessage);
        totalDelivered += batchResponse.successCount;
        totalFailed += batchResponse.failureCount;

        const chunkInvalidTokens: string[] = [];
        batchResponse.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              const badToken = chunk[idx];
              if (badToken) {
                chunkInvalidTokens.push(badToken);
                allInvalidTokens.push(badToken);
              }
            }
          }
        });

        if (chunkInvalidTokens.length > 0) {
          logger.info(`[FCM] Deactivating ${chunkInvalidTokens.length} unregistered/invalid tokens in batch.`);
          await DeviceTokenRepository.deactivateTokens(chunkInvalidTokens);
        }
      } catch (err: any) {
        logger.warn(`[FCM] Batch multicast send failed: ${err.message}`);
        totalFailed += chunk.length;
      }
    }

    return {
      targetedCount: uniqueTokens.length,
      deliveredCount: totalDelivered,
      failedCount: totalFailed,
      invalidTokens: allInvalidTokens,
    };
  }

  /**
   * Sends a notification to all active devices registered for a specific user.
   */
  static async sendToUser(userId: string, payload: NotificationPayload): Promise<{
    targetedDevices: number;
    deliveredCount: number;
    failedCount: number;
    skipped?: boolean;
  }> {
    const devices = await DeviceTokenRepository.findActiveTokensByUser(userId);
    if (devices.length === 0) {
      return { targetedDevices: 0, deliveredCount: 0, failedCount: 0 };
    }

    if (!this.isReady()) {
      return {
        targetedDevices: devices.length,
        deliveredCount: 0,
        failedCount: 0,
        skipped: true,
      };
    }

    const tokens = devices.map((d) => d.token);
    const result = await this.sendMulticast(tokens, payload);

    return {
      targetedDevices: result.targetedCount,
      deliveredCount: result.deliveredCount,
      failedCount: result.failedCount,
      skipped: result.skipped,
    };
  }

  /**
   * Internal test reset helper.
   */
  static _resetForTesting(): void {
    this.app = null;
    this.isInitialized = false;
  }
}
