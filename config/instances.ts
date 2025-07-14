import clientPromise from './mongodb';
import { zetaChainProvider, ethSepoliaProvider, opSepoliaProvider } from './rpcURLs';
import { ethers, Contract } from 'ethers';
import multicallABI from './contractABI';
import { Collection, Db, Document } from 'mongodb';

// Type definition for a token
interface Token {
  symbol: string;
  name: string;
  address: string | null;
  blockchain: string;
  decimals: number;
}

// Interface to match MongoDB token document
interface TokenDocument extends Document {
  symbol: string;
  name: string;
  address?: string | null;
  blockchain: string;
  decimals: number;
}

/**
 * Initializes and returns multicall contract instances per chain,
 * as well as ERC20 and native token configurations from the database.
 * @returns Muticall contract instances nad token details based on different tokens and blokcchains
 */
let cachedInstances: Record<string, Contract> | null = null;
let cachedERC20TokenMap: Token[] | null = null;
let cachedNativeTokenMap: Record<string, Token> | null = null;

export default async function createContractInstances(): Promise<{
  instances: Record<string, Contract>;
  ERC20Tokens: Token[];
  nativeTokens: Record<string, Token>;
}> {
  const client = await clientPromise;
  const db: Db = client.db('Holdings');
  const tokensCollection: Collection<TokenDocument> = db.collection<TokenDocument>('tokens');

  // Return cached result if available
  if (cachedInstances && cachedERC20TokenMap && cachedNativeTokenMap) {
    return {
      instances: cachedInstances,
      ERC20Tokens: cachedERC20TokenMap,
      nativeTokens: cachedNativeTokenMap,
    };
  }

  const results: TokenDocument[] = await tokensCollection.find().toArray();

  const multicallInstances: Record<string, Contract> = {};
  const ERC20Tokens: Token[] = [];
  const nativeTokens: Record<string, Token> = {};

  for (const item of results) {
    if (!item.address) {
      const provider =
        item.blockchain === 'Ethereum Sepolia'
          ? ethSepoliaProvider
          : item.blockchain === 'ZetaChain Athens'
          ? zetaChainProvider
          : item.blockchain === 'Optimism Sepolia'
          ? opSepoliaProvider
          : null;

      const multicallAddress =
        item.blockchain === 'Ethereum Sepolia'
          ? process.env.ethSepoliaAddress!
          : item.blockchain === 'ZetaChain Athens'
          ? process.env.zetaChainAddress!
          : item.blockchain === 'Optimism Sepolia'
          ? process.env.opSepoliaAddress!
          : null;

      if (!provider || !multicallAddress) continue;
      //If address is null → this is a native token entry, initializing provider for each blockchain 
      multicallInstances[item.blockchain] = new Contract(multicallAddress, multicallABI, provider);

      /*If address is null → this is a native token entry, provider will be the same but 
      seggregating the token details from erc-20 tokens*/ 
      nativeTokens[item.blockchain] = {
        symbol: item.symbol,
        name: item.name,
        address: item.address ?? null,
        blockchain: item.blockchain,
        decimals: item.decimals,
      };
    } else {
      
      /*If address is not null → this is an erc-20 token entry, provider will be the same 
      and token detials will be added to an array for sending to multicall contract*/
      ERC20Tokens.push({
        symbol: item.symbol,
        name: item.name,
        address: item.address ?? null,
        blockchain: item.blockchain,
        decimals: item.decimals,
      });
    }
  }

  // Cache results
  cachedInstances = multicallInstances;
  cachedERC20TokenMap = ERC20Tokens;
  cachedNativeTokenMap = nativeTokens;

  return {
    instances: multicallInstances,
    ERC20Tokens,
    nativeTokens,
  };
}
