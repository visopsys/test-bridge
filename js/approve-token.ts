import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createApproveCheckedInstruction,
} from "@solana/spl-token";
import { getFeePayer, getConnection, bridgeProgramId, mintPubkey, ownerAssociatedAccount } from "./common";

const approveToken = async(bridgePda: PublicKey, mintPubkey: PublicKey, ownerAta: PublicKey) => {
  const feePayer = await getFeePayer();
  let tx = new Transaction().add(
    createApproveCheckedInstruction(
      ownerAta, // user associated account
      mintPubkey, // mint
      bridgePda, // delegate
      feePayer.publicKey, // owner of token account
      100000e8, // amount, if your deciamls is 8, 10^8 for 1 token
      8 // decimals
    )
  );

  const connection = getConnection();
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

  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId
  );

  console.log("Running approve token");
  await approveToken(result[0], mintPubkey, ownerAssociatedAccount);
})();

export {
  approveToken
}
