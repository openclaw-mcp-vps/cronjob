import cron from "node-cron";
import parser from "cron-parser";

export function isValidCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

export function getNextRunAt(expression: string, from: Date = new Date()): Date {
  const interval = parser.parseExpression(expression, {
    currentDate: from
  });

  return interval.next().toDate();
}
