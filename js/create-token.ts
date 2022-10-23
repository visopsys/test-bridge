import {
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createMint,
} from "@solana/spl-token";
import {
  getFeePayer,
  getConnection,
} from './common';

const createToken = async (secretHex: String) => {
  // connection
  const connection = getConnection();
  const feePayer = await getFeePayer();

  const secret = Buffer.from(secretHex, 'hex');
  const mint = Keypair.fromSecretKey(secret);
  Buffer.from(mint.secretKey);
  console.log(`mint pub key: ${mint.publicKey.toBase58()}`);

  let mintAccount = await connection.getAccountInfo(mint.publicKey, "confirmed");
  if (mintAccount) {
    console.log("Token has been created");
    return;
  }

  let tx = new Transaction().add(
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

  await sendAndConfirmTransaction(connection, tx, [feePayer, mint], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });

  return mint.publicKey;
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  const secretHex = String(process.env.MINT_SECRET_HEX!);
  await createToken(secretHex);
})();

export {
  createToken
}
