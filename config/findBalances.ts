import getPrices from './getPrices';
import createContractInstances from './instances';
import { ethers } from 'ethers';

const ERC20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

const erc20Interface = new ethers.Interface(ERC20Abi);

export default async function getBatchedBalances(addresses: string[]) {
  const pricesInUSD = await getPrices();
  const { instances, ERC20Tokens, nativeTokens } = await createContractInstances();

  const balancesByAddress: Record<string, any[]> = {};
  const valueByAddress: Record<string, number> = {};

  for (const chain of Object.keys(instances)) {
    const multicall = instances[chain];
    if (!multicall) continue;

    // Filter tokens by chain
    const tokenList = ERC20Tokens.filter(t => t.blockchain === chain && t.address);
    const calls: { target: string; callData: string }[] = [];

    // Build calls: one per (wallet, token)
    for (const address of addresses) {
      for (const token of tokenList) {
        const callData = erc20Interface.encodeFunctionData('balanceOf', [address]);
        calls.push({ target: token.address!, callData });
      }
    }

    try {
      const [blockNumber, returnData] = await multicall.aggregateMultiAddress(calls);
      const nativeBalances: bigint[] = await multicall.getBalances(addresses);

      let index = 0;
      for (const address of addresses) {
        if (!balancesByAddress[address]) balancesByAddress[address] = [];
        if (!valueByAddress[address]) valueByAddress[address] = 0;

        for (const token of tokenList) {
          const ret = returnData[index++];
          const decoded = erc20Interface.decodeFunctionResult('balanceOf', ret)[0];
          const formatted = ethers.formatUnits(decoded, token.decimals);
          const value = Number(formatted) * (pricesInUSD[token.symbol.toLowerCase()]?.usd || 0);

          if (Number(decoded) > 0) {
            balancesByAddress[address].push({
              symbol: token.symbol,
              name: token.name,
              contractAddress: token.address,
              balance: decoded.toString(),
              formattedBalance: formatted.toString(),
              value,
              walletAddress: address,
              blockchain: chain,
              decimals: token.decimals,
            });
            valueByAddress[address] += value;
          }
        }
      }

      // Native token balances
      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        const native = nativeBalances[i];
        const formatted = ethers.formatUnits(native, nativeTokens[chain].decimals);
        const value = Number(formatted) * (pricesInUSD[nativeTokens[chain].symbol.toLowerCase()]?.usd || 0);

        if (Number(native) > 0) {
          balancesByAddress[address].push({
            symbol: nativeTokens[chain].symbol,
            name: nativeTokens[chain].name,
            contractAddress: null,
            balance: native.toString(),
            formattedBalance: formatted.toString(),
            value,
            walletAddress: address,
            blockchain: chain,
            decimals: nativeTokens[chain].decimals,
          });
          valueByAddress[address] += value;
        }
      }
    } catch (err) {
      console.error(`Multicall failed for ${chain}:`, err);
    }
  }

  return { balancesByAddress, valueByAddress };
}
