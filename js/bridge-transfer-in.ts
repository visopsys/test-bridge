import {
  PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction, SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getFeePayer, getConnection, bridgeProgramId, getTxUrl, mintPubkey, ownerAssociatedAccount,
  bridgeAssociatedAccount, accountExisted} from "./common";
import {
  TransferInData,
  TransferInDataSchema
} from "./types";
import { serialize } from "borsh";

const tranferIn = async(bridgeProgramId: PublicKey, bridgeAssociatedAccount: PublicKey,
  receiverAta: PublicKey,) => {
  const connection = getConnection();
  const feePayer = await getFeePayer();

  console.log("bridgeAssociatedAccount = ", bridgeAssociatedAccount.toString())

  // Make sure that the accounts are created
  if (!(await accountExisted(connection, bridgeAssociatedAccount))) {
    console.log("Bridge ata account is not created. Please create bridge ata first");
    process.exit(0);
  }

  if (!(await accountExisted(connection, receiverAta))) {
    console.log("Receiver ata account is not created. Please create receiver ata first");
    process.exit(0);
  }

  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId
  );
  const bridgePda = result[0];

  const data = new TransferInData({
    nonce: 1,
    amount : [5],
  });

  console.log("feePayer.publicKey = ", feePayer.publicKey.toString());
  console.log("TOKEN_PROGRAM_ID = ", TOKEN_PROGRAM_ID.toString());
  console.log("bridgePda = ", bridgePda.toString());
  console.log("bridgeAssociatedAccount = ", bridgeAssociatedAccount.toString());
  console.log("receiverAta = ", receiverAta.toString());

  const payload = serialize(TransferInDataSchema, data);

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
        pubkey: bridgePda,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: bridgeAssociatedAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: receiverAta,
        isSigner: false,
        isWritable: true,
      },
    ],
    data: Buffer.from(new Uint8Array([2, ...payload])), // 2 is thcd ../se transferOut command
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

  console.log("txid = ", txid);
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  if (process.argv.length < 2) {
    console.log("Please specify receiver ata");
    process.exit(0);
  }

  await tranferIn(bridgeProgramId, bridgeAssociatedAccount,
    new PublicKey(process.argv[2]));
})();
