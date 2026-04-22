import { redirect } from 'next/navigation';

export default function PennyLogRedirect() {
  redirect('/transactions');
}
