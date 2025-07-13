import schedule from 'node-schedule';
import clientPromise from './config/mongodb';
import getBatchedBalances from './config/findBalances';
import { Collection, Db } from 'mongodb';

interface Wallet {
  address: string;
}

interface BalanceResult {
  symbol: string;
  name: string;
  contractAddress: string | null;
  balance: string;
  formattedBalance: string;
  value: number;
  walletAddress: string;
  blockchain: string;
  decimals: number;
}

interface BalanceDoc {
  address: string;
  value: number;
  balances: BalanceResult[];
  timestamp: number;
}

async function main(): Promise<void> {
  const client = await clientPromise;
  const db: Db = client.db('Holdings');

  const walletsCollection: Collection<Wallet> = db.collection<Wallet>('wallets');
  const balancesCollection: Collection<BalanceDoc> = db.collection<BalanceDoc>('balances');

  const wallets: Wallet[] = await walletsCollection.find({}, { projection: { address: 1, _id: 0 } }).toArray();
  const addresses: string[] = wallets.map((w) => w.address);

  try {
    const {
      balancesByAddress,
      valueByAddress,
    }: {
      balancesByAddress: Record<string, BalanceResult[]>;
      valueByAddress: Record<string, number>;
    } = await getBatchedBalances(addresses);

    const balanceDocs: BalanceDoc[] = [];

    for (const addr of addresses) {
      const tokenBalances = balancesByAddress[addr];
      if (tokenBalances && tokenBalances.length > 0) {
        balanceDocs.push({
          address: addr,
          value: valueByAddress[addr],
          balances: tokenBalances,
          timestamp: Date.now(),
        });
      }
    }

    if (balanceDocs.length > 0) {
      await balancesCollection.insertMany(balanceDocs);
      console.log(`Inserted ${balanceDocs.length} balance records`);
    } else {
      console.log('ℹNo balances to insert.');
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Error in balance sync job:', err.message);
    } else {
      console.error('Unknown error in balance sync job');
    }
  }
}

// Initial run
main();

// Scheduled every 6 hours
schedule.scheduleJob('0 */6 * * *', async () => {
  console.log('Running scheduled balance sync job...');
  await main();
});
