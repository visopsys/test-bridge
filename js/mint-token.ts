import { sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { createMintToCheckedInstruction } from "@solana/spl-token";
import { getFeePayer, getConnection, mintPubkey, ownerAssociatedAccount } from "./common";

const mintToken = async () => {
  // connection
  const connection = getConnection();
  const feePayer = await getFeePayer();

  let tx = new Transaction().add(
    createMintToCheckedInstruction(
      mintPubkey, // mint
      ownerAssociatedAccount, // receiver (sholud be a token account)
      feePayer.publicKey, // mint authority
      1000e8, // amount. if your decimals is 8, you mint 10^8 for 1 token.
      8 // decimals
    )
  );

  await sendAndConfirmTransaction(connection, tx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  await mintToken();
})();

export {
  mintToken
}
