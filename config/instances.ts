import clientPromise from './mongodb';
import { zetaChainProvider, ethSepoliaProvider, opSepoliaProvider } from './rpcURLs';
import { ethers } from 'ethers';
import multicallABI from './contractABI';


interface Token {
  symbol: string;
  name: string;
  address: string | null;
  blockchain: string;
  decimals: number;
}

let cachedInstances: { [chain: string]: ethers.Contract } | null = null;
let cachedERC20TokenMap: Token[];
let cachedNativeTokenMap: any;


export default async function createContractInstances() {

  const client = await clientPromise;
  const db = client.db('Holdings');
  const tokensCollection = db.collection('tokens');

  if (cachedInstances && cachedERC20TokenMap && cachedNativeTokenMap) {
    return { instances: cachedInstances, ERC20Tokens: cachedERC20TokenMap, nativeTokens: cachedNativeTokenMap };
  }
  const results = await tokensCollection.find().toArray();
  const multicallInstances: { [chain: string]: ethers.Contract } = {};
  const ERC20Tokens: Token[] = [];
  const nativeTokens: any= []; 
  for (const item of results) {
    if (!item.address) {
      const provider =
        item.blockchain === "Ethereum Sepolia"
          ? ethSepoliaProvider
          : item.blockchain === "ZetaChain Athens"
          ? zetaChainProvider
          : item.blockchain === "Optimism Sepolia"
          ? opSepoliaProvider
          : null;

      const multicallAddress =
        item.blockchain === "Ethereum Sepolia"
          ? process.env.ethSepoliaAddress!
          : item.blockchain === "ZetaChain Athens"
          ? process.env.zetaChainAddress!
          : item.blockchain === "Optimism Sepolia"
          ? process.env.opSepoliaAddress!
          : null;

      if (!provider || !multicallAddress) continue;
      multicallInstances[item.blockchain] = new ethers.Contract(multicallAddress, multicallABI, provider)
      nativeTokens[item.blockchain] = {
      symbol: item.symbol,
      name: item.name,
      address: item.address ?? null,
      blockchain: item.blockchain,
      decimals: item.decimals,
    }
    } else{
      ERC20Tokens.push({
        symbol: item.symbol,
        name: item.name,
        address: item.address ?? null,
        blockchain: item.blockchain,
        decimals: item.decimals,
      })
    }
    
  }
  cachedInstances = multicallInstances;
  cachedERC20TokenMap = ERC20Tokens;
  cachedNativeTokenMap = nativeTokens
  return { instances: multicallInstances, ERC20Tokens: ERC20Tokens, nativeTokens: nativeTokens };
}


