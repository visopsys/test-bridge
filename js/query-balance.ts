import { PublicKey } from "@solana/web3.js";
import {
  getConnection,
  ownerAssociatedAccount,
  bridgeAssociatedAccount,
} from './common'

(async () => {
  const connection = getConnection();

  console.log("ownerAssociatedAccount = ", ownerAssociatedAccount.toString());

    let tokenAmount = await connection.getTokenAccountBalance(bridgeAssociatedAccount);
  console.log(`amount: ${tokenAmount.value.amount}`);
  console.log(`decimals: ${tokenAmount.value.decimals}`);
})();
