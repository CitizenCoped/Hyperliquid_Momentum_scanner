import { logger } from "./logger";

const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";
const DEFAULT_TIMEOUT_MS = 5000;

export interface PushoverMessage {
  title: string;
  message: string;
  priority?: number;
  url?: string;
  url_title?: string;
}

export async function sendPushover(
  msg: PushoverMessage,
  opts: {
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<{
  success: boolean;
  message: string;
}> {
  const token = process.env.PUSHOVER_APP_TOKEN;
  const user = process.env.PUSHOVER_USER_KEY;
  if (!token || !user) {
    return {
      success: false,
      message: "PUSHOVER_APP_TOKEN or PUSHOVER_USER_KEY not configured",
    };
  }
  try {
    const body = new URLSearchParams({
      token,
      user,
      title: msg.title,
      message: msg.message,
    });
    if (msg.priority !== undefined) body.set("priority", String(msg.priority));
    if (msg.url) body.set("url", msg.url);
    if (msg.url_title) body.set("url_title", msg.url_title);

    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await (opts.fetchImpl ?? fetch)(PUSHOVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: number;
        errors?: string[];
      };
      if (res.ok && data.status === 1) {
        return { success: true, message: "Notification sent" };
      }
      const errMsg = data.errors?.join(", ") ?? `HTTP ${res.status}`;
      logger.warn({ data, status: res.status }, "Pushover send failed");
      return { success: false, message: errMsg };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    logger.error({ err }, "Pushover request error");
    return {
      success: false,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
