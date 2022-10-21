import {
  PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction, SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getFeePayer, getConnection, bridgeProgramId, getTxUrl, mintPubkey, ownerAssociatedAccount,
  bridgeAssociatedAccount} from "./common";
import BN from 'bn.js';
import {
  TransferOutData,
  TransferOutDataSchema
} from "./types";
import { serialize } from "borsh";

const transferOut = async() => {
  const connection = getConnection();
  const feePayer = await getFeePayer();

  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId
  );
  console.log("Address and bump = ", result[0].toString(), result[1]);
  const bridgePda = result[0];

  const data = new TransferOutData({
    amount: new BN(900),
    tokenAddress: "0x1234",
    chainId: 123,
    recipient: "someone",
  });
  const payload = serialize(TransferOutDataSchema, data);

  let ix = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: ownerAssociatedAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: bridgeAssociatedAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: bridgePda,
        isSigner: false,
        isWritable: true,
      },
    ],
    data: Buffer.from(new Uint8Array([1, ...payload])),
    programId: bridgeProgramId,
  });

  console.log('data = ', ix.data.toString('hex'));

  let signers = [feePayer];
  const tx = new Transaction();
  tx.add(ix);

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

  await transferOut();
})();

export {
  transferOut
}
