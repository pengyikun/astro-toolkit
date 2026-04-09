import { z } from 'zod';

export const mailSettingSchema = z.object({
  imap_host: z.string().min(1, 'IMAP host is required'),
  imap_port: z.coerce.number().int().min(1).max(65535),
  imap_encryption: z.enum(['tls', 'start-tls', 'none']),
  imap_login: z.string().min(1, 'IMAP login is required'),
  imap_password: z.string().min(1, 'IMAP password is required'),
  email: z.string().email('Valid email is required'),
});

export const mailFetchSchema = z.object({
  folders: z.array(z.string().min(1)).min(1, 'At least one folder is required'),
  date_from: z.string().min(1, 'Start date is required'),
  date_to: z.string().min(1, 'End date is required'),
});
