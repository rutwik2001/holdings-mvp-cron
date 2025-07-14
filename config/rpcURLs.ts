import 'dotenv/config'; 
import { ethers, JsonRpcProvider } from 'ethers';
require('dotenv').config();

// Load RPC URLs from environment variables for different EVM-compatible testnets
const zetaChainRPC: string = process.env.zetaChainRPC!;
const ethSpeoliaRPC: string = process.env.ethSpeoliaRPC!;
const opSepoliaRpc: string = process.env.opSepoliaRPC!;

// Create JsonRpcProvider instances for each blockchain network
const zetaChainProvider: JsonRpcProvider = new ethers.JsonRpcProvider(zetaChainRPC);
const ethSepoliaProvider: JsonRpcProvider = new ethers.JsonRpcProvider(ethSpeoliaRPC);
const opSepoliaProvider: JsonRpcProvider = new ethers.JsonRpcProvider(opSepoliaRpc);

export { zetaChainProvider, ethSepoliaProvider, opSepoliaProvider };
