import {
  PublicKey,
} from "@solana/web3.js";
import {
  getConnection,
  bridgeAssociatedAccount,
} from './common'

async function queryBalance(account: PublicKey) {
  console.log("account = ", account.toString());

  const connection = getConnection();

  let tokenAmount = await connection.getTokenAccountBalance(account);
  console.log(`amount: ${tokenAmount.value.amount}`);
  console.log(`decimals: ${tokenAmount.value.decimals}`);
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  if (process.argv.length == 2) {
    await queryBalance(bridgeAssociatedAccount);
  } else {
    console.log("process.argv[2] = ", process.argv[2])
    await queryBalance(new PublicKey(process.argv[2]));
  }
})();
