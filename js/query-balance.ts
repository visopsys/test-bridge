import { PublicKey } from "@solana/web3.js";
import {
  getConnection,
  ownerAssociatedAccount,
  bridgeAssociatedAccount,
} from './common'

(async () => {
  const connection = getConnection();

  let tokenAmount = await connection.getTokenAccountBalance(ownerAssociatedAccount);
  console.log(`amount: ${tokenAmount.value.amount}`);
  console.log(`decimals: ${tokenAmount.value.decimals}`);
})();
