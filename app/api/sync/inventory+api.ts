import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { inventory, userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, clampNumber, sanitizeMetadata } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

const VALID_ITEM_TYPES = new Set(['chest', 'streak_multiplier', 'booster', 'cosmetic']);
type ItemType = 'chest' | 'streak_multiplier' | 'booster' | 'cosmetic';

interface InventoryUpsertBody {
  authId: string;
  itemId: string;
  itemType: ItemType;
  itemName?: string;
  quantity?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}

async function resolveUserId(db: ReturnType<typeof getDb>, authId: string): Promise<string | null> {
  const rows = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);

  return rows[0]?.id ?? null;
}

/** GET /api/sync/inventory?authId=xxx */
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'sync-inventory-get', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 254);

    if (!authId) {
      return Response.json({ error: 'Missing authId query parameter' }, { status: 400 });
    }

    const db = getDb();
    const userId = await resolveUserId(db, authId);

    if (!userId) {
      return Response.json({ ok: true, inventory: [] });
    }

    const rows = await db
      .select()
      .from(inventory)
      .where(eq(inventory.userId, userId));

    return Response.json({ ok: true, inventory: rows });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'sync/inventory GET');
  }
}

/** POST /api/sync/inventory, upsert inventory item */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'sync-inventory-post', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as InventoryUpsertBody;
    const authId = sanitizeString(body.authId, 254);
    const itemId = sanitizeString(body.itemId, 128);
    const itemType = body.itemType;

    if (!authId) {
      return Response.json({ error: 'Missing authId' }, { status: 400 });
    }
    if (!itemId) {
      return Response.json({ error: 'Missing itemId' }, { status: 400 });
    }
    if (!itemType || !VALID_ITEM_TYPES.has(itemType)) {
      return Response.json({ error: 'Invalid itemType' }, { status: 400 });
    }

    const db = getDb();
    const userId = await resolveUserId(db, authId);

    if (!userId) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const itemName = sanitizeString(body.itemName, 100) ?? undefined;
    const quantity = clampNumber(body.quantity ?? 1, 0, 9999) ?? 1;
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : false;
    const metadata = sanitizeMetadata(body.metadata);
    const expiresAt = sanitizeString(body.expiresAt, 30) ?? undefined;

    await db
      .insert(inventory)
      .values({
        userId,
        itemId,
        itemType,
        itemName,
        quantity,
        isActive,
        metadata,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [inventory.userId, inventory.itemId],
        set: {
          itemType,
          itemName,
          quantity,
          isActive,
          metadata,
          expiresAt,
        },
      });

    const rows = await db
      .select()
      .from(inventory)
      .where(eq(inventory.userId, userId));

    return Response.json({ ok: true, inventory: rows });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'sync/inventory POST');
  }
}
