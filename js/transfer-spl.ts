import {
  PublicKey, Transaction, sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction
} from "@solana/spl-token";
import { getFeePayer, getConnection, mintPubkey, ownerAssociatedAccount,
  bridgeAssociatedAccount} from "./common";

const transferSpl = async(tokenMintPubkey: PublicKey, ownerAta: PublicKey,
  recipientAta: PublicKey) => {
  const connection = getConnection();
  const feePayer = await getFeePayer();

  console.log("Transfering transferSpl....")

  let tx = new Transaction().add(
    createTransferCheckedInstruction(
      ownerAta, // from (should be a token account)
      tokenMintPubkey, // mint
      recipientAta, // to (should be a token account)
      feePayer.publicKey, // from's owner
      100, // amount, if your deciamls is 8, send 10^8 for 1 token
      8 // decimals
    )
  );

  let signers = [feePayer];

  let txid = await sendAndConfirmTransaction(connection, tx, signers, {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });

  console.log("txid = ", txid);
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  await transferSpl(mintPubkey, ownerAssociatedAccount, bridgeAssociatedAccount);
})();
