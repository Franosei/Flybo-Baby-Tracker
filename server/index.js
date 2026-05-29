import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, query } from './db.js';

const app = express();
const port = Number(process.env.PORT ?? 4174);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '..', 'dist');

app.use(express.json());

const defaultProfile = {
  id: null,
  shareCode: null,
  name: '',
  dateOfBirth: null,
  ageWeeks: null,
};

const normalizeShareCode = (value) => String(value ?? '').trim().replace(/\D/g, '').slice(0, 6);

const shareCodeFromRequest = (request) => normalizeShareCode(request.get('X-Flybo-Share-Code') ?? request.query.shareCode);

const generateShareCode = () => String(Math.floor(100000 + Math.random() * 900000));

const toDateInput = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

const toProfile = (row) => ({
  id: row.id,
  shareCode: row.share_code,
  name: row.name ?? '',
  dateOfBirth: toDateInput(row.date_of_birth),
  ageWeeks: row.age_weeks ?? null,
});

const toFeedRecord = (row) => ({
  id: row.id,
  type: 'feed',
  timestamp: row.recorded_at,
  details: {
    feedType: row.feed_type,
    durationMinutes: row.duration_minutes ?? undefined,
    amount: row.quantity === null ? undefined : Number(row.quantity),
    unit: row.unit ?? undefined,
  },
});

const toNappyRecord = (row) => ({
  id: row.id,
  type: row.nappy_type,
  timestamp: row.recorded_at,
  details: null,
});

const parseProfile = (body) => {
  const rawAge = Number(body.ageWeeks);
  const dateOfBirth = typeof body.dateOfBirth === 'string' && body.dateOfBirth.trim()
    ? body.dateOfBirth.slice(0, 10)
    : null;

  return {
    id: typeof body.id === 'string' ? body.id : null,
    shareCode: normalizeShareCode(body.shareCode),
    name: typeof body.name === 'string' ? body.name.trim() : '',
    dateOfBirth,
    ageWeeks: Number.isFinite(rawAge) && rawAge >= 0 ? Math.floor(rawAge) : null,
  };
};

const parseTimestamp = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
};

const getBabyById = async (id) => {
  const result = await query('select * from baby_profiles where id = $1', [id]);
  return result.rows[0] ? toProfile(result.rows[0]) : null;
};

const getBabyByShareCode = async (shareCode) => {
  const normalizedCode = normalizeShareCode(shareCode);
  if (!normalizedCode) return null;

  const result = await query('select * from baby_profiles where share_code = $1', [normalizedCode]);
  return result.rows[0] ? toProfile(result.rows[0]) : null;
};

const createBabyProfile = async ({ name, dateOfBirth, ageWeeks }) => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const result = await query(
        `insert into baby_profiles (share_code, name, date_of_birth, age_weeks)
         values ($1, $2, $3, $4)
         returning *`,
        [generateShareCode(), name, dateOfBirth, ageWeeks],
      );
      return toProfile(result.rows[0]);
    } catch (error) {
      if (error.code !== '23505') throw error;
    }
  }

  throw new Error('Unable to generate a unique baby ID');
};

const requireSharedBaby = async (request, response) => {
  const shareCode = shareCodeFromRequest(request);
  const profile = await getBabyByShareCode(shareCode);

  if (!profile) {
    response.status(404).json({ error: 'Baby ID not found' });
    return null;
  }

  return profile;
};

const listActivities = async (babyId) => {
  if (!babyId) return [];

  const [feedingResult, nappyResult] = await Promise.all([
    query(
      `select id, feed_type::text, duration_minutes, quantity, unit::text, recorded_at
       from feeding_records
       where baby_id = $1`,
      [babyId],
    ),
    query(
      `select id, nappy_type::text, recorded_at
       from nappy_records
       where baby_id = $1`,
      [babyId],
    ),
  ]);

  return [
    ...feedingResult.rows.map(toFeedRecord),
    ...nappyResult.rows.map(toNappyRecord),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const profileWithActivities = async (profile) => ({
  profile,
  activities: await listActivities(profile.id),
});

app.get('/api/health', async (_request, response, next) => {
  try {
    await query('select 1');
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/bootstrap', async (request, response, next) => {
  try {
    const shareCode = shareCodeFromRequest(request);
    if (!shareCode) {
      response.json({ profile: defaultProfile, activities: [] });
      return;
    }

    const profile = await getBabyByShareCode(shareCode);
    if (!profile) {
      response.status(404).json({ error: 'Baby ID not found' });
      return;
    }

    response.json(await profileWithActivities(profile));
  } catch (error) {
    next(error);
  }
});

app.get('/api/babies/:shareCode', async (request, response, next) => {
  try {
    const profile = await getBabyByShareCode(request.params.shareCode);

    if (!profile) {
      response.status(404).json({ error: 'Baby ID not found' });
      return;
    }

    response.json(await profileWithActivities(profile));
  } catch (error) {
    next(error);
  }
});

app.put('/api/profile', async (request, response, next) => {
  try {
    const nextProfile = parseProfile(request.body);
    const currentProfile = nextProfile.shareCode
      ? await getBabyByShareCode(nextProfile.shareCode)
      : nextProfile.id
        ? await getBabyById(nextProfile.id)
        : null;

    if (!currentProfile) {
      const profile = await createBabyProfile(nextProfile);
      response.json({ profile });
      return;
    }

    const result = await query(
      `update baby_profiles
       set name = $1, date_of_birth = $2, age_weeks = $3, updated_at = now()
       where id = $4
       returning *`,
      [nextProfile.name, nextProfile.dateOfBirth, nextProfile.ageWeeks, currentProfile.id],
    );

    response.json({ profile: toProfile(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/activities', async (request, response, next) => {
  try {
    const profile = await requireSharedBaby(request, response);
    if (!profile) return;

    const { type, details } = request.body;

    if (type === 'feed') {
      if (!details || !['breastfeeding', 'expressed', 'formula'].includes(details.feedType)) {
        response.status(400).json({ error: 'Invalid feed details' });
        return;
      }

      const result =
        details.feedType === 'breastfeeding'
          ? await query(
              `insert into feeding_records (baby_id, feed_type, duration_minutes)
               values ($1, $2, $3)
               returning id, feed_type::text, duration_minutes, quantity, unit::text, recorded_at`,
              [profile.id, details.feedType, Number(details.durationMinutes)],
            )
          : await query(
              `insert into feeding_records (baby_id, feed_type, quantity, unit)
               values ($1, $2, $3, $4)
               returning id, feed_type::text, duration_minutes, quantity, unit::text, recorded_at`,
              [profile.id, details.feedType, Number(details.amount), details.unit],
            );

      response.status(201).json({ record: toFeedRecord(result.rows[0]) });
      return;
    }

    if (type === 'wee' || type === 'poop') {
      const result = await query(
        `insert into nappy_records (baby_id, nappy_type)
         values ($1, $2)
         returning id, nappy_type::text, recorded_at`,
        [profile.id, type],
      );

      response.status(201).json({ record: toNappyRecord(result.rows[0]) });
      return;
    }

    response.status(400).json({ error: 'Invalid activity type' });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/activities/:id', async (request, response, next) => {
  try {
    const profile = await requireSharedBaby(request, response);
    if (!profile) return;

    const { id } = request.params;
    const { type } = request.query;
    const recordedAt = parseTimestamp(request.body?.timestamp);

    if (!recordedAt) {
      response.status(400).json({ error: 'Invalid timestamp' });
      return;
    }

    if (type === 'feed') {
      const result = await query(
        `update feeding_records
         set recorded_at = $1
         where id = $2 and baby_id = $3
         returning id, feed_type::text, duration_minutes, quantity, unit::text, recorded_at`,
        [recordedAt, id, profile.id],
      );

      if (!result.rows[0]) {
        response.status(404).json({ error: 'Activity not found' });
        return;
      }

      response.json({ record: toFeedRecord(result.rows[0]) });
      return;
    }

    if (type === 'wee' || type === 'poop') {
      const result = await query(
        `update nappy_records
         set recorded_at = $1
         where id = $2 and baby_id = $3 and nappy_type = $4
         returning id, nappy_type::text, recorded_at`,
        [recordedAt, id, profile.id, type],
      );

      if (!result.rows[0]) {
        response.status(404).json({ error: 'Activity not found' });
        return;
      }

      response.json({ record: toNappyRecord(result.rows[0]) });
      return;
    }

    response.status(400).json({ error: 'Invalid activity type' });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/activities/:id', async (request, response, next) => {
  try {
    const profile = await requireSharedBaby(request, response);
    if (!profile) return;

    const { id } = request.params;
    const { type } = request.query;

    if (type === 'feed') {
      await query('delete from feeding_records where id = $1 and baby_id = $2', [id, profile.id]);
      response.json({ ok: true });
      return;
    }

    if (type === 'wee' || type === 'poop') {
      await query('delete from nappy_records where id = $1 and baby_id = $2 and nappy_type = $3', [id, profile.id, type]);
      response.json({ ok: true });
      return;
    }

    response.status(400).json({ error: 'Invalid activity type' });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(distPath));

app.use((request, response, next) => {
  if (request.method === 'GET' && !request.path.startsWith('/api')) {
    response.sendFile(path.join(distPath, 'index.html'));
    return;
  }

  next();
});

app.use((error, _request, response, _next) => {
  console.error(error.message);
  response.status(500).json({ error: 'Server error' });
});

const server = app.listen(port, () => {
  console.log(`Flybo server listening on port ${port}`);
});

const shutdown = async () => {
  server.close();
  await pool.end();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
