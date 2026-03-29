'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { snippetSchema } from '@/schemas/snippet.schema';
import * as SnippetModel from '@/models/snippet.model';
import db from '@/lib/db';
import { ownerUserIdFromScope, requireAccessScope } from '@/lib/access';

export async function createSnippet(formData: FormData) {
  const scope = await requireAccessScope();
  const raw = {
    title: formData.get('title'),
    snippet_type: formData.get('snippet_type'),
    content: formData.get('content'),
    notes: formData.get('notes') || '',
  };

  const parsed = snippetSchema.safeParse(raw);
  if (!parsed.success) return;

  await SnippetModel.create(db, {
    ...parsed.data,
    owner_user_id: ownerUserIdFromScope(scope),
  });
  const path = parsed.data.snippet_type === 'json' ? '/json-parser' : '/xml-parser';
  revalidatePath(path);
  redirect(path);
}

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
