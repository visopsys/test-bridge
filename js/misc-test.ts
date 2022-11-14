import {
  TransferOutData,
  TransferOutDataSchema,
} from './types';
import { getFeePayer } from './common';

const Base58 = require('base-58')

import { serialize } from "borsh";
import BN from 'bn.js';

function test_serialize() {
  const value = new TransferOutData({
    amount: new BN(900),
    tokenAddress: "0x1234",
    chainId: 123,
    recipient: "someone",
  });

  console.log('serialize = ', serialize);

  const buffer = serialize(TransferOutDataSchema, value);
  console.log("buffer length = ", buffer.length);

  const arr = Uint8Array.from(buffer);
  console.log("arr = ", Base58.encode(arr));
}

async function test_pubkey() {
  const feePayer = await getFeePayer();
  console.log("Privatekey = ", feePayer.secretKey);

  const buf = feePayer.publicKey.toBuffer();
  const encode = Base58.encode(buf);

  console.log("encode 58 = ", encode);
  console.log("encode hex = ", buf.toString('hex'));
  console.log("feePayer.publicKey = ", feePayer.publicKey.toString());
}

(async () => {
  if (process.argv[1] != __filename) {
    return ;
  }

  await test_pubkey();
})();
