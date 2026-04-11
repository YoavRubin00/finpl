import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { inventory, userProfiles } from '../../src/db/schema';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const authId = req.query.authId as string | undefined;
      if (!authId) {
        return res.status(400).json({ error: 'Missing authId query parameter' });
      }

      const db = getDb();
      const userId = await resolveUserId(db, authId);

      if (!userId) {
        return res.status(200).json({ ok: true, inventory: [] });
      }

      const rows = await db
        .select()
        .from(inventory)
        .where(eq(inventory.userId, userId));

      return res.status(200).json({ ok: true, inventory: rows });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body as InventoryUpsertBody;
      const { authId, itemId, itemType, ...data } = body;

      if (!authId) {
        return res.status(400).json({ error: 'Missing authId' });
      }

      if (!itemId) {
        return res.status(400).json({ error: 'Missing itemId' });
      }

      if (!itemType) {
        return res.status(400).json({ error: 'Missing itemType' });
      }

      const db = getDb();
      const userId = await resolveUserId(db, authId);

      if (!userId) {
        return res.status(404).json({ error: 'User not found for authId' });
      }

      await db
        .insert(inventory)
        .values({
          userId,
          itemId,
          itemType,
          itemName: data.itemName ?? undefined,
          quantity: data.quantity ?? 1,
          isActive: data.isActive ?? false,
          metadata: data.metadata ?? {},
          expiresAt: data.expiresAt ?? undefined,
        })
        .onConflictDoUpdate({
          target: [inventory.userId, inventory.itemId],
          set: {
            itemType,
            itemName: data.itemName ?? undefined,
            quantity: data.quantity ?? 1,
            isActive: data.isActive ?? false,
            metadata: data.metadata ?? {},
            expiresAt: data.expiresAt ?? undefined,
          },
        });

      const rows = await db
        .select()
        .from(inventory)
        .where(eq(inventory.userId, userId));

      return res.status(200).json({ ok: true, inventory: rows });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
