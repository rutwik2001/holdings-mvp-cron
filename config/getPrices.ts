import 'dotenv/config';
require('dotenv').config();
import clientPromise from './mongodb';
import { Db, Collection, Document, WithId } from 'mongodb';

// Interface for price cache document stored in MongoDB
interface PriceCache extends Document {
  prices: Record<string, { usd: number }>;
  updatedAt: Date;
}

/**
 * Fetches token prices in USD.
 * Tries to reuse the last cached result if it is less than 6 hours old.
 * Otherwise, fetches fresh prices from CoinGecko and updates the cache.
 * @returns prices of different tokens in usd
 */
export default async function getPrices(): Promise<Record<string, { usd: number }>> {
  const client = await clientPromise;
  const db: Db = client.db('Holdings');
  const cacheCollection: Collection<PriceCache> = db.collection<PriceCache>('pricesCache');
  
  //fetching latest price cache
  const latestCache: WithId<PriceCache> | null = await cacheCollection
    .find({})
    .sort({ updatedAt: -1 }) // sort newest first
    .limit(1)
    .next();

  const now: number = Date.now();
  const oneDayMs: number = 6 * 60 * 60 * 1000; // 6 hours

  //checking for the difference in times if let 6 hrs cache price is returned
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

    //insert a new document to build on this different prices to expand functinalities
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

    //if any error occurs return the recently cached data irrepective of time difference
    if (latestCache) {
      return latestCache.prices;
    }

    throw new Error('Failed to fetch prices and no cached data is available.');
  }
}
