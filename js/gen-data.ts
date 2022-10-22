import {
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import { createToken } from './create-token';
import { getFeePayer, sleep } from './common';
import { createTokenAccount } from './create-token-account';
import { createBridgeAccount } from './bridge-initialize';
import { mintToken } from './mint-token';
import { approveToken } from './approve-token';
import { transferOut } from './bridge-transfer-out';

const genSecret = async (bridgeProgramIdString: String) => {
  console.log("Bridge program id = ", bridgeProgramIdString);
  const bridgeProgramId = new PublicKey(bridgeProgramIdString);

  const mint = Keypair.generate();
  const secretHex = Buffer.from(mint.secretKey).toString('hex');

  console.log(`secret hex: ${secretHex}`);
  console.log(`public key, base58 : ${mint.publicKey.toBase58()}`);

  // Gen token
  await createToken(secretHex);

  // Create bridge pda
  await createBridgeAccount();

  // Gen ATA
  const feePayer = await getFeePayer();
  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId,
  );
  const bridgePda = result[0];

  console.log("Creating ATA account for user");
  const userAta = await createTokenAccount(mint.publicKey, feePayer.publicKey);

  console.log("Creating ATA account for PDA");
  const bridgeAta = await createTokenAccount(mint.publicKey, bridgePda);

  // Mint token to the owner:
  await mintToken(mint.publicKey, userAta);

  // Approve the bridge for token transfer
  await approveToken(bridgePda, mint.publicKey, userAta);

  // Transfer token to the bridge
  await transferOut(bridgeProgramId, userAta, bridgeAta);

  console.log('=======================================');
  console.log('Copy the following lines into .env file');
  console.log('=======================================');
  console.log(`BRIDGE_PROGRAM_ID=${bridgeProgramIdString}`);
  console.log(`MINT_SECRET_HEX=${secretHex}`);
  console.log(`MINT_PUBKEY=${mint.publicKey.toBase58()}`);
  console.log(`OWNER_ATA=${userAta}`);
  console.log(`BRIDGE_ATA=${bridgeAta}`);
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  await genSecret(process.argv[2]);
})();
