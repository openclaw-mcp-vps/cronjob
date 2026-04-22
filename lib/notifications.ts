import axios from "axios";
import nodemailer from "nodemailer";

interface FailureNotificationInput {
  jobName: string;
  jobId: string;
  errorMessage: string;
  notifyEmail: string | null;
  failureWebhookUrl: string | null;
  executionId: number;
  responseStatus?: number | null;
}

function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
}

export async function sendFailureNotification(input: FailureNotificationInput): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (input.notifyEmail) {
    const transporter = getTransporter();

    tasks.push(
      transporter.sendMail({
        from: process.env.SMTP_FROM ?? "Cronjob <no-reply@cronjob.run>",
        to: input.notifyEmail,
        subject: `Cronjob alert: ${input.jobName} failed`,
        text: [
          `Job: ${input.jobName}`,
          `Job ID: ${input.jobId}`,
          `Execution ID: ${input.executionId}`,
          input.responseStatus ? `HTTP Status: ${input.responseStatus}` : "HTTP Status: n/a",
          `Error: ${input.errorMessage}`
        ].join("\n")
      })
    );
  }

  if (input.failureWebhookUrl) {
    tasks.push(
      axios.post(
        input.failureWebhookUrl,
        {
          event: "job.failed",
          jobId: input.jobId,
          jobName: input.jobName,
          executionId: input.executionId,
          responseStatus: input.responseStatus ?? null,
          errorMessage: input.errorMessage,
          timestamp: new Date().toISOString()
        },
        {
          timeout: 10_000
        }
      )
    );
  }

  if (!tasks.length) {
    return;
  }

  await Promise.allSettled(tasks);
}
