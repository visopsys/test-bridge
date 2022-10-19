import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Keypair,
  Transaction,
} from "@solana/web3.js";
import {
  approveChecked,
  getAssociatedTokenAddress,
  createApproveCheckedInstruction,
} from "@solana/spl-token";
import * as bs58 from "bs58";
import { getFeePayer, getConnection, bridgeProgramId, mintPubkey, ownerAssociatedAccount, bridgeAssociatedAccount } from "./common";

(async () => {
  const feePayer = await getFeePayer();
  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId
  );
  console.log("Address and bump = ", result[0].toString(), result[1]);
  const bridgePda = result[0];

  // const bridgeAssociatedAddr = new PublicKey(
  //   "68cDVqhtoaECnX3zQQJNkJQbyEqbYkhtq9wM433X3NUZ"
  // );

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
  console.log(
    `txhash: ${await connection.sendTransaction(tx, [
      feePayer,
      feePayer,
    ])}`
  );
})();
