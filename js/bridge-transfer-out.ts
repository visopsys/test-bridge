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

const transferOut = async(bridgeProgramId: PublicKey, tokenPubkey: PublicKey, ownerAta: PublicKey,
  bridgeAta: PublicKey) => {
  const connection = getConnection();
  const feePayer = await getFeePayer();

  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId
  );
  console.log("Address and bump = ", result[0].toString(), result[1]);
  const bridgePda = result[0];

  console.log("Bridge ATA = ", bridgeAta.toString());

  const data = new TransferOutData({
    amount: new BN(1000e8),
    tokenAddress: tokenPubkey.toString(),
    chainId: 189985, // ganache1
    recipient: "0x8095f5b69F2970f38DC6eBD2682ed71E4939f988",
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
        pubkey: ownerAta,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: bridgeAta,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: bridgePda,
        isSigner: false,
        isWritable: true,
      },
    ],
    data: Buffer.from(new Uint8Array([1, ...payload])), // 1 is thcd ../se transferOut command
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

  await transferOut(bridgeProgramId, mintPubkey, ownerAssociatedAccount, bridgeAssociatedAccount);
})();

export {
  transferOut
}
