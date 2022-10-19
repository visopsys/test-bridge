import {
  TransferOutData,
  TransferOutDataSchema,
} from './types';
const Base58 = require('base-58')

import { serialize } from "borsh";
import BN from 'bn.js';

function main() {
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

main()
