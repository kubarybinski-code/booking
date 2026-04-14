import { Resend } from 'resend';
import { serverEnv } from '@/lib/config/env';

const resend = new Resend(serverEnv.RESEND_API_KEY);

export async function sendTransactionalEmail(input: {
  to: string;
  from: string;
  subject: string;
  html: string;
}) {
  return resend.emails.send({
    to: input.to,
    from: input.from,
    subject: input.subject,
    html: input.html,
  });
}
