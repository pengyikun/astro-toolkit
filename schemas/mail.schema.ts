import { z } from 'zod';

export const mailSettingSchema = z.object({
  imap_host: z.string().min(1, 'IMAP host is required'),
  imap_port: z.coerce.number().int().min(1).max(65535),
  imap_encryption: z.enum(['tls', 'start-tls', 'none']),
  imap_login: z.string().min(1, 'IMAP login is required'),
  imap_password: z.string().min(1, 'IMAP password is required'),
  email: z.string().email('Valid email is required'),
});

