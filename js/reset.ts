import {
  createToken
} from './create-token';
import { createBridgeAccount } from './bridge-initialize';

const main = async () => {
  await createToken();
  await createBridgeAccount();
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  await main();
})();
