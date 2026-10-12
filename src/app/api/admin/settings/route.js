import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { HttpError, requireAdminApi } from '@/lib/auth';
import { handler, ok } from '@/lib/http';
import { saveSetting } from '@/lib/settings';
import { SETTINGS } from '@/lib/content-schemas';

export const dynamic = 'force-dynamic';

export const PUT = handler(async (req) => {
  await requireAdminApi('settings.write');
  const { key, value } = z.object({ key: z.string(), value: z.any() }).parse(await req.json());
  if (!SETTINGS[key]) throw new HttpError(422, 'Unknown settings section.');
  await saveSetting(key, SETTINGS[key].parse(value));
  revalidatePath('/', 'layout');
  return ok({ ok: true });
});
