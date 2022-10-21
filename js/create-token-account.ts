import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

import {
  getFeePayer,
  getConnection,
  mintPubkey,
  accountExisted,
} from './common'

const createTokenAccount = async (mintPubkey: PublicKey, ownerPubkey: PublicKey) => {
  // connection
  const connection = getConnection();
  const feePayer = await getFeePayer();

  // if your wallet is off-curve, you should use
  let ata = await getAssociatedTokenAddress(
    mintPubkey, // mint
    ownerPubkey, // owner
    true, // allowOwnerOffCurve
  );

  if (await accountExisted(connection, ata)) {
    console.log("ATA account has been created");
    return ata;
  }

  let tx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      feePayer.publicKey, // payer
      ata, // ata
      ownerPubkey, // owner
      mintPubkey // mint
    )
  );

  let txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });

  console.log(`ATA: ${ata.toBase58()}`);

  return ata;
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  const feePayer = await getFeePayer();
  await createTokenAccount(mintPubkey, feePayer.publicKey);
})();


export {
  createTokenAccount
}
