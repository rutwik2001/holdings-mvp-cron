import 'dotenv/config'; 
import { ethers } from 'ethers';
require('dotenv').config();

const zetaChainRPC: string = process.env.zetaChainRPC!
const ethSpeoliaRPC: string = process.env.ethSpeoliaRPC!
const opSepoliaRpc: string = process.env.opSepoliaRPC!


const zetaChainProvider = new ethers.JsonRpcProvider(zetaChainRPC);
const ethSepoliaProvider = new ethers.JsonRpcProvider(ethSpeoliaRPC);
const opSepoliaProvider = new ethers.JsonRpcProvider(opSepoliaRpc);

export {zetaChainProvider, ethSepoliaProvider, opSepoliaProvider}