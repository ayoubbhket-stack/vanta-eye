import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { HttpError, requireAdminApi } from '@/lib/auth';
import { handler, ok } from '@/lib/http';
import { saveSetting } from '@/lib/settings';
import { CONTENT } from '@/lib/content-schemas';

export const dynamic = 'force-dynamic';

export const PUT = handler(async (req) => {
  await requireAdminApi('content.write');
  const { key, value } = z.object({ key: z.string(), value: z.any() }).parse(await req.json());
  if (!CONTENT[key]) throw new HttpError(422, 'Unknown content section.');
  await saveSetting(key, CONTENT[key].parse(value));
  revalidatePath('/', 'layout');
  return ok({ ok: true });
});
