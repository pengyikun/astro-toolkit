import { redirect } from 'next/navigation';

export default function BicRedirect() {
  redirect('/validate?mode=bic');
}
