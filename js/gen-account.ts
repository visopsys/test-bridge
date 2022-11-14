import {
  Keypair,
} from "@solana/web3.js";
import * as dotenv from "dotenv";

import * as bip39  from 'bip39';

async function main() {
  const mnemonic = String(process.env.MNEMONIC);
  if (!mnemonic) {
    console.log("Empty mnemonic");
    process.exit(0);
  }

  const seed = await bip39.mnemonicToSeed(mnemonic);
  const keypair = Keypair.fromSeed(seed.subarray(0, 32));

  console.log('secret = ', keypair.secretKey);
  console.log("pubkey = ", keypair.publicKey.toString());
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  dotenv.config();
  await main();
})();
