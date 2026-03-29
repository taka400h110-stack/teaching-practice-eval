
import { Env } from '../../../types/env';
import { EmailProvider } from './emailProvider';
import { ResendEmailProvider } from './resendEmailProvider';
import { SendGridEmailProvider } from './sendgridEmailProvider';

export function createEmailProvider(env: Env): EmailProvider | null {
  const providerName = env.EMAIL_PROVIDER || 'resend';
  
  if (providerName === 'resend' && env.RESEND_API_KEY) {
    return new ResendEmailProvider(env.RESEND_API_KEY);
  } else if (providerName === 'sendgrid' && env.SENDGRID_API_KEY) {
    return new SendGridEmailProvider(env.SENDGRID_API_KEY);
  }
  
  return null; // Not properly configured
}
