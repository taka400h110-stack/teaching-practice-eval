import { test, expect } from '@playwright/test';
import { ResendEmailProvider } from '../src/api/services/providers/resendEmailProvider';
import { SendGridEmailProvider } from '../src/api/services/providers/sendgridEmailProvider';
import { createEmailProvider } from '../src/api/services/providers/emailProviderFactory';
import { Env } from '../src/types/env';

test.describe('Email Providers', () => {
  test('Factory creates Resend provider', () => {
    const env = { EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-resend-key' } as Env;
    const provider = createEmailProvider(env);
    expect(provider).toBeInstanceOf(ResendEmailProvider);
  });

  test('Factory creates SendGrid provider', () => {
    const env = { EMAIL_PROVIDER: 'sendgrid', SENDGRID_API_KEY: 'test-sendgrid-key' } as Env;
    const provider = createEmailProvider(env);
    expect(provider).toBeInstanceOf(SendGridEmailProvider);
  });

  test('Factory returns null if keys missing', () => {
    const env = { EMAIL_PROVIDER: 'resend' } as Env;
    const provider = createEmailProvider(env);
    expect(provider).toBeNull();
  });
});
