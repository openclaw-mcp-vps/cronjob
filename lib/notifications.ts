import axios from "axios";
import nodemailer from "nodemailer";

import type { ExecutionLogRecord, JobRecord, UserRecord } from "@/lib/types";

type FailureNotificationInput = {
  job: JobRecord;
  user: UserRecord;
  log: ExecutionLogRecord;
  errorMessage: string;
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

async function sendFailureEmail(input: FailureNotificationInput) {
  const transport = getTransport();

  if (!transport) {
    return;
  }

  const to = input.user.notificationEmail || input.user.email;

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "alerts@cronjob.run",
    to,
    subject: `Cronjob alert: ${input.job.name} failed`,
    text: [
      `Job: ${input.job.name}`,
      `Webhook: ${input.job.webhookUrl}`,
      `When: ${input.log.startedAt}`,
      `Attempt: ${input.log.attempt}`,
      `Error: ${input.errorMessage}`,
      "",
      "Open your dashboard logs for full response details."
    ].join("\n")
  });
}

async function sendFailureWebhook(input: FailureNotificationInput) {
  const target = input.job.failureWebhookUrl || input.user.defaultFailureWebhookUrl;

  if (!target) {
    return;
  }

  await axios.post(
    target,
    {
      event: "job.failed",
      jobId: input.job.id,
      jobName: input.job.name,
      webhookUrl: input.job.webhookUrl,
      startedAt: input.log.startedAt,
      attempt: input.log.attempt,
      error: input.errorMessage
    },
    {
      timeout: 10_000,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}

export async function sendFailureNotifications(input: FailureNotificationInput) {
  const actions = [sendFailureEmail(input), sendFailureWebhook(input)];
  await Promise.allSettled(actions);
}
