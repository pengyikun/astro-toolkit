import { redirect } from 'next/navigation';

export default function JsonParserRedirect() {
  redirect('/parser?format=json');
}
