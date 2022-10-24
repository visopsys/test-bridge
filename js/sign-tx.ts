import {
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  sendAndConfirmTransaction,
  ConfirmOptions,
  Signer,
  SignaturePubkeyPair,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { getFeePayer, getConnection, ownerAssociatedAccount, bridgeAssociatedAccount, bridgeProgramId, printBuffer } from './common';
import * as ed25519 from '@noble/ed25519';
import {
  TransferOutData,
  TransferOutDataSchema
} from "./types";
import BN from 'bn.js';
import { serialize } from "borsh";

type Ed25519SecretKey = Uint8Array;

const doSign = (
  message: Parameters<typeof ed25519.sync.sign>[0],
  secretKey: Ed25519SecretKey,
) => ed25519.sync.sign(message, secretKey.slice(0, 32));

const toBuffer = (arr: Buffer | Uint8Array | Array<number>): Buffer => {
  if (Buffer.isBuffer(arr)) {
    return arr;
  } else if (arr instanceof Uint8Array) {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  } else {
    return Buffer.from(arr);
  }
};

const addSignature = function(transaction: Transaction, pubkey: PublicKey, signature: Buffer) {
  if (!(signature.length === 64)) {
    throw new Error('Signature length is not 64');
  }

  const index = transaction.signatures.findIndex(sigpair =>
    pubkey.equals(sigpair.publicKey),
  );
  if (index < 0) {
    throw new Error(`unknown signer: ${pubkey.toString()}`);
  }

  transaction.signatures[index].signature = Buffer.from(signature);
}

const signTransaction = function (transaction: Transaction, accountKeys: PublicKey[], ...signers: Array<Signer>) {
  if (signers.length === 0) {
    throw new Error('No signers');
  }

  // Dedupe signers
  const seen = new Set();
  const uniqueSigners = [];
  for (const signer of signers) {
    console.log(signer.publicKey);

    const key = signer.publicKey.toString();
    if (seen.has(key)) {
      continue;
    } else {
      seen.add(key);
      uniqueSigners.push(signer);
    }
  }

  transaction.signatures = uniqueSigners.map(signer => ({
    signature: null,
    publicKey: signer.publicKey,
  }));

  const message = transaction.compileMessage();
  const signData = message.serialize();

  // console.log("Message utf8 = ", signData.toString('utf8'))

  signers.forEach(signer => {
    const signature = doSign(signData, signer.secretKey);
    // this._addSignature(signer.publicKey, toBuffer(signature));
    addSignature(transaction, signer.publicKey, toBuffer(signature));
  });
}

async function getTransaction(feePayer: Keypair): Promise<Transaction> {
  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId
  );
  const bridgePda = result[0];

  const data = new TransferOutData({
    amount: new BN(900),
    tokenAddress: "0x1234",
    chainId: 123,
    recipient: "someone",
  });
  const payload = serialize(TransferOutDataSchema, data);

  printBuffer(Buffer.from(payload));

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
    data: Buffer.from(new Uint8Array([1, ...payload])), // 1 is the transferOut command
    programId: bridgeProgramId,
  });

  let signers = [feePayer];
  const tx = new Transaction();
  tx.add(ix);

  return tx
}

const signMessage = async () => {
  const connection = getConnection();
  const feePayer = await getFeePayer();

  const mint = Keypair.generate();
  const secretHex = Buffer.from(mint.secretKey).toString('hex');

  // Gen token
  let transaction = await getTransaction(feePayer);
  const options = {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  } as ConfirmOptions;

  const signers = [feePayer];
  const sendOptions = options && {
    skipPreflight: options.skipPreflight,
    preflightCommitment: options.preflightCommitment || options.commitment,
  };

  const latestBlockhash = await connection.getLatestBlockhash('finalized');
  transaction.recentBlockhash = latestBlockhash.blockhash;

  // transaction.sign(...signers);

  signTransaction(transaction, [feePayer.publicKey, mint.publicKey], ...signers)

  if (!transaction.signature) {
    throw new Error('!signature'); // should never happen
  }

  const wireTransaction = transaction.serialize();
  let txId = await connection.sendRawTransaction(wireTransaction, options);
  console.log("Txid = ", txId);
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  const feePayer = await getFeePayer();

  console.log("secret length = ", feePayer.secretKey.length);

  await signMessage();
})();
