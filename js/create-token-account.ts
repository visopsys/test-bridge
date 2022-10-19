import {
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,createAssociatedTokenAccount

} from "@solana/spl-token";

import {
  getFeePayer,
  getConnection,
  bridgeProgramId,
  mintPubkey,
} from './common'

(async () => {
  // connection
  const connection = getConnection();
  const feePayer = await getFeePayer();

  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId
  );
  console.log("Address and bump = ", result[0].toString(), result[1]);

  const owner = result[0];
  // const owner = feePayer.publicKey;

  // if your wallet is off-curve, you should use
  let ata = await getAssociatedTokenAddress(
    mintPubkey, // mint
    owner, // owner
    true, // allowOwnerOffCurve
  );

  console.log(`ATA: ${ata.toBase58()}`);

  let tx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      feePayer.publicKey, // payer
      ata, // ata
      owner, // owner
      mintPubkey // mint
    )
  );
  console.log(`txhash: ${await connection.sendTransaction(tx, [feePayer])}`);
})();
