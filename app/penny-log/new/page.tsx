import { redirect } from 'next/navigation';

export default function PennyLogNewRedirect() {
  redirect('/transactions/new');
}
