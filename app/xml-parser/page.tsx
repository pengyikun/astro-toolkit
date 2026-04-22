import { redirect } from 'next/navigation';

export default function XmlParserRedirect() {
  redirect('/parser?format=xml');
}
