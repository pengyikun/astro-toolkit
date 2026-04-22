import { redirect } from 'next/navigation';

export default function IbanRedirect() {
  redirect('/validate?mode=iban');
}
