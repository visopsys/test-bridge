import {
  createMint,
} from "@solana/spl-token";

import {
  getFeePayer,
  getConnection,
} from './common'

(async () => {
  // connection
  const connection = getConnection();

  const feePayer = await getFeePayer();

  const alice = feePayer;

  // 1) use build-in function
  let mintPubkey = await createMint(
    connection, // conneciton
    feePayer, // fee payer
    alice.publicKey, // mint authority
    alice.publicKey, // freeze authority (you can use `null` to disable it. when you disable it, you can't turn it on again)
    8 // decimals
  );
  console.log(`mint: ${mintPubkey.toBase58()}`);
})();
