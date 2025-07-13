import schedule from 'node-schedule';
import clientPromise from './config/mongodb';
import getBatchedBalances from './config/findBalances';

async function main() {
  const client = await clientPromise;
  const db = client.db('Holdings');
  const walletsCollection = db.collection('wallets');
  const balancesCollection = db.collection('balances');

  const wallets = await walletsCollection.find({}, { projection: { address: 1, _id: 0 } }).toArray();
  const addresses: string[] = wallets.map(w => w.address);

  try {
    const { balancesByAddress, valueByAddress } = await getBatchedBalances(addresses);
    const balanceDocs = [];

    for (const addr of addresses) {
      const tokenBalances = balancesByAddress[addr];
      if (tokenBalances && tokenBalances.length > 0) {
        balanceDocs.push({
          address: addr,
          value: valueByAddress[addr],
          balances: tokenBalances,
          timestamp: Date.now()
        });
      }
    }

    if (balanceDocs.length > 0) {
      await balancesCollection.insertMany(balanceDocs);
      console.log(`Inserted ${balanceDocs.length} balance records`);
    } else {
      console.log("No balances to insert.");
    }
  } catch (err: any) {
    console.error("Error in balance sync job:", err.message);
  }
}
main()
schedule.scheduleJob('0 */6 * * *', async () => {
  console.log("⏰ Running scheduled balance sync job...");
  await main();
});
