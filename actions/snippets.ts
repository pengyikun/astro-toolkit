'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import * as SnippetModel from '@/models/snippet.model';
import db from '@/lib/db';
import { requireAccessScope } from '@/lib/access';

export async function deleteSnippet(formData: FormData) {
  const scope = await requireAccessScope();
  const id = Number(formData.get('id'));
  const snippetType = formData.get('snippet_type') as string;
  if (!id || isNaN(id)) return;

  await SnippetModel.remove(db, id, scope);
  const savedPath = snippetType === 'json' ? '/json-parser/saved' : '/xml-parser/saved';
  revalidatePath(savedPath);
  redirect(savedPath);
}
