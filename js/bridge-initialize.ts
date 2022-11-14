import {
  PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction, SystemProgram, TransactionBlockhashCtor,
} from "@solana/web3.js";
import { format } from "path";
import { getFeePayer, getConnection, bridgeProgramId, getTxUrl, } from "./common";

const createBridgeAccount = async() => {
  const connection = getConnection();
  const feePayer = await getFeePayer();

  console.log("feePayer = ", feePayer.publicKey.toString());
  console.log("bridgeProgramId = ", bridgeProgramId.toString());

  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId
  );
  const bridgePda = result[0];
  console.log("bridgePda = ", bridgePda.toString());

  let pdaAccount = await connection.getAccountInfo(bridgePda, "confirmed");
  if (pdaAccount) {
    console.log("Pda has been created!")
    return;
  }

  console.log("PDA = ", pdaAccount);

  let ix = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: bridgePda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      }
    ],
    data: Buffer.from(new Uint8Array([0, ])),
    programId: bridgeProgramId,
  });

  let signers = [feePayer];
  const tx = new Transaction();
  tx.feePayer = feePayer.publicKey;
  tx.add(ix);

  console.log("Sending birdge init instruciton....");

  let txid = await sendAndConfirmTransaction(connection, tx, signers, {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });

  console.log("Bridge init tx id = ", txid);
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  await createBridgeAccount();
})();

export {
  createBridgeAccount
}
