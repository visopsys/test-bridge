import { PublicKey, Transaction } from "@solana/web3.js";
import { createMintToCheckedInstruction } from "@solana/spl-token";
import { getFeePayer, getConnection, mintPubkey, ownerAssociatedAccount } from "./common";

(async () => {
  // connection
  const connection = getConnection();
  const feePayer = await getFeePayer();
  const alice = feePayer;

  // 2) compose by yourself
  {
    let tx = new Transaction().add(
      createMintToCheckedInstruction(
        mintPubkey, // mint
        ownerAssociatedAccount, // receiver (sholud be a token account)
        alice.publicKey, // mint authority
        1e8, // amount. if your decimals is 8, you mint 10^8 for 1 token.
        8 // decimals
      )
    );
    console.log(
      `txhash: ${await connection.sendTransaction(tx, [
        feePayer,
        alice /* fee payer + mint authority */,
      ])}`
    );
  }
})();
