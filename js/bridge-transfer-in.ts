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
  TransferInData,
  TransferInDataSchema
} from "./types";
import { serialize } from "borsh";

const tranferIn = async(bridgeProgramId: PublicKey, ownerAssociatedAccount: PublicKey,
    bridgeAssociatedAccount: PublicKey) => {
  const connection = getConnection();
  const feePayer = await getFeePayer();

  const result = await PublicKey.findProgramAddress(
    [Buffer.from('SisuBridge', 'utf8')],
    bridgeProgramId
  );
  const bridgePda = result[0];

  const data = new TransferInData({
    amount: new BN(666),
  });

  const payload = serialize(TransferInDataSchema, data);
}


(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  await tranferIn(bridgeProgramId, ownerAssociatedAccount, bridgeAssociatedAccount);
})();
