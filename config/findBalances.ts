import getPrices from './getPrices';
import createContractInstances from './instances';
import { ethers, Interface, Contract } from 'ethers';

// ----- Interfaces -----
// Represents a token object from the database
interface Token {
  symbol: string;
  name: string;
  address: string | null;
  blockchain: string;
  decimals: number;
}

// Represents the structure of a token balance for a wallet
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


const ERC20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

const erc20Interface: Interface = new ethers.Interface(ERC20Abi);

/**
 * Retrieves token balances and USD values for a list of wallet addresses.
 * Uses multicall contracts per chain to batch balanceOf calls for ERC-20 tokens
 * and native token balances.
 *
 * @param addresses - Array of wallet addresses
 * @returns balancesByAddress - Token balance data of different tokens, grouped by address
 *          valueByAddress - Total portfolio USD value grouped by address
 */
export default async function getBatchedBalances(
  addresses: string[]
): Promise<{
  balancesByAddress: Record<string, BalanceResult[]>;
  valueByAddress: Record<string, number>;
}> {
  const pricesInUSD: Record<string, { usd: number }> = await getPrices();

  // Get deployed contract instances, token metadata, and native token definitions
  const {
    instances,
    ERC20Tokens,
    nativeTokens,
  }: {
    instances: Record<string, Contract>;
    ERC20Tokens: Token[];
    nativeTokens: Record<string, Token>;
  } = await createContractInstances();

  const balancesByAddress: Record<string, BalanceResult[]> = {};
  const valueByAddress: Record<string, number> = {};

  // Loop through all EVM chains initialized
  for (const chain of Object.keys(instances)) {
    const multicall: Contract = instances[chain];
    if (!multicall) continue;

    // Group ERC20 token calls by chain and prepare batched calls for all (address, token) pairs
    const tokenList: Token[] = ERC20Tokens.filter(t => t.blockchain === chain && t.address);
    const calls: { target: string; callData: string }[] = [];

    for (const address of addresses) {
      for (const token of tokenList) {
        const callData: string = erc20Interface.encodeFunctionData('balanceOf', [address]);
        calls.push({ target: token.address!, callData });
      }
    }

    try {
       // Execute batched ERC-20 balanceOf calls using multicall
      const [blockNumber, returnData]: [bigint, string[]] = await multicall.aggregateMultiAddress(calls);

      // Also get native token balances in one call
      const nativeBalances: bigint[] = await multicall.getBalances(addresses);

      let index = 0;

       // Process ERC-20 token results, Only adds non-zero balances
      for (const address of addresses) {
        if (!balancesByAddress[address]) balancesByAddress[address] = [];
        if (!valueByAddress[address]) valueByAddress[address] = 0;

        for (const token of tokenList) {
          const ret: string = returnData[index++];
          const decoded: bigint = erc20Interface.decodeFunctionResult('balanceOf', ret)[0] as bigint;
          const formatted: string = ethers.formatUnits(decoded, token.decimals);
          const value: number = Number(formatted) * (pricesInUSD[token.symbol.toLowerCase()]?.usd || 0);

          if (decoded > 0n) {
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

      // Add native token balances, Only adds non-zero balances
      for (let i = 0; i < addresses.length; i++) {
        const address: string = addresses[i];
        const native: bigint = nativeBalances[i];
        const nativeToken: Token = nativeTokens[chain];
        const formatted: string = ethers.formatUnits(native, nativeToken.decimals);
        const value: number = Number(formatted) * (pricesInUSD[nativeToken.symbol.toLowerCase()]?.usd || 0);

        if (native > 0n) {
          balancesByAddress[address].push({
            symbol: nativeToken.symbol,
            name: nativeToken.name,
            contractAddress: null,
            balance: native.toString(),
            formattedBalance: formatted.toString(),
            value,
            walletAddress: address,
            blockchain: chain,
            decimals: nativeToken.decimals,
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
