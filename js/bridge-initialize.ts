import {
  PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction, SystemProgram,
} from "@solana/web3.js";
import { getFeePayer, getConnection, bridgeProgramId, getTxUrl, } from "./common";

const createBridgeAccount = async() => {
  const connection = getConnection();
  const feePayer = await getFeePayer();

  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId
  );
  const bridgePda = result[0];

  let pdaAccount = await connection.getAccountInfo(bridgePda, "confirmed");
  if (pdaAccount) {
    console.log("Pda has been created!")
    return;
  }

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
  tx.add(ix);

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
