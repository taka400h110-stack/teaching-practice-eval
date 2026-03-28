
export interface EmailProvider {
  send(input: {
    to: string[];
    from: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{
    provider: string;
    messageId?: string | null;
  }>;
}
