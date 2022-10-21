import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createApproveCheckedInstruction,
} from "@solana/spl-token";
import { getFeePayer, getConnection, bridgeProgramId, mintPubkey, ownerAssociatedAccount } from "./common";

const approveToken = async(bridgeProgramId: PublicKey) => {
  const feePayer = await getFeePayer();
  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId
  );
  console.log("Address and bump = ", result[0].toString(), result[1]);
  const bridgePda = result[0];

  let tx = new Transaction().add(
    createApproveCheckedInstruction(
      ownerAssociatedAccount, // user associated account
      mintPubkey, // mint
      bridgePda, // delegate
      feePayer.publicKey, // owner of token account
      1e8, // amount, if your deciamls is 8, 10^8 for 1 token
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

  console.log("Running approve token");
  await approveToken(bridgeProgramId);
})();

export {
  approveToken
}
