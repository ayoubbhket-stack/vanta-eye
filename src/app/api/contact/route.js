import { getDb, schema as s } from '@/db';
import { assertSameOrigin, clientIp, handler, ok, rateLimit } from '@/lib/http';
import { contactSchema } from '@/lib/validation';
import { getSetting } from '@/lib/settings';
import { sendEmail } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  assertSameOrigin(req);
  rateLimit(`contact:${clientIp(req)}`, 4);
  const data = contactSchema.parse(await req.json());
  const db = await getDb();
  await db.insert(s.contactMessages).values(data);
  const store = await getSetting('store');
  if (store.notifyEmail) await sendEmail({ to: store.notifyEmail, subject: `Contact form: ${data.subject || 'message'}`, text: `${data.name} <${data.email}> ${data.phone}\n\n${data.body}` });
  return ok({ ok: true });
});
