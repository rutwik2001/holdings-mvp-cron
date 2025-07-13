import 'dotenv/config';
require('dotenv').config();
import clientPromise from './mongodb';
import { Db, Collection, Document, WithId } from 'mongodb';

interface PriceCache extends Document {
  prices: Record<string, { usd: number }>;
  updatedAt: Date;
}

export default async function getPrices(): Promise<Record<string, { usd: number }>> {
  const client = await clientPromise;
  const db: Db = client.db('Holdings');
  const cacheCollection: Collection<PriceCache> = db.collection<PriceCache>('pricesCache');

  const latestCache: WithId<PriceCache> | null = await cacheCollection
    .find({})
    .sort({ updatedAt: -1 }) // sort newest first
    .limit(1)
    .next();

  const now: number = Date.now();
  const oneDayMs: number = 6 * 60 * 60 * 1000; // 6 hours

  if (latestCache && now - latestCache.updatedAt.getTime() < oneDayMs) {
    return latestCache.prices;
  }

  try {
    const pricesResp: Response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&symbols=btc%2Ceth%2Czeta%2C%20usdc`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-cg-demo-api-key': process.env.coingeckoAPI!,
        },
      }
    );

    if (!pricesResp.ok) {
      throw new Error(`Failed to fetch prices: ${pricesResp.status}`);
    }

    const prices: Record<string, { usd: number }> = await pricesResp.json();

    await cacheCollection.insertOne({
      prices,
      updatedAt: new Date(),
    });

    return prices;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Fetch error:', error.message);
    } else {
      console.error('Unknown fetch error');
    }

    if (latestCache) {
      // fallback to stale cache
      return latestCache.prices;
    }

    throw new Error('Failed to fetch prices and no cached data is available.');
  }
}
