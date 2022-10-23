import {
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  sendAndConfirmTransaction,
  ConfirmOptions,
  Signer,
  SignaturePubkeyPair,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { getFeePayer, getConnection } from './common';
import * as ed25519 from '@noble/ed25519';

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

  signers.forEach(signer => {
    const signature = doSign(signData, signer.secretKey);
    // this._addSignature(signer.publicKey, toBuffer(signature));
    addSignature(transaction, signer.publicKey, toBuffer(signature));
  });
}

const signMessage = async (bridgeProgramIdString: String) => {
  const connection = getConnection();
  const feePayer = await getFeePayer();

  console.log("Bridge program id = ", bridgeProgramIdString);
  const bridgeProgramId = new PublicKey(bridgeProgramIdString);

  const mint = Keypair.generate();
  const secretHex = Buffer.from(mint.secretKey).toString('hex');

  console.log(`secret hex: ${secretHex}`);
  console.log(`public key, base58 : ${mint.publicKey.toBase58()}`);

  // Gen token
  let transaction = new Transaction().add(
    // create mint account
    SystemProgram.createAccount({
      fromPubkey: feePayer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports: await getMinimumBalanceForRentExemptMint(connection),
      programId: TOKEN_PROGRAM_ID,
    }),
    // init mint account
    createInitializeMintInstruction(
      mint.publicKey, // mint pubkey
      8, // decimals
      feePayer.publicKey, // mint authority
      feePayer.publicKey // freeze authority (you can use `null` to disable it. when you disable it, you can't turn it on again)
    )
  );
  const options = {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  } as ConfirmOptions;

  const signers = [feePayer, mint];
  const sendOptions = options && {
    skipPreflight: options.skipPreflight,
    preflightCommitment: options.preflightCommitment || options.commitment,
  };

  ///

  const latestBlockhash = await connection.getLatestBlockhash('finalized');
  transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
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

  await signMessage(process.argv[2]);
})();
