import {
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  sendAndConfirmTransaction,
  ConfirmOptions,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { getFeePayer, getConnection } from './common';
import * as ed25519 from '@noble/ed25519';

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

  transaction.sign(...signers);
  if (!transaction.signature) {
    throw new Error('!signature'); // should never happen
  }

  const signature = transaction.signature.toString('base64');
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
