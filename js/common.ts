import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";

import {
  readFile,
} from "mz/fs";

const NETWORK = "localhost";
const bridgeProgramId = new PublicKey("HguMTvmDfspHuEWycDSP1XtVQJi47hVNAyLbFEf2EJEQ");
const mintPubkey = new PublicKey("H9bLazh1cXh5iEkSJGEtcZdvWp158qRPY27WyRQJChHH");
const ownerAssociatedAccount = new PublicKey("82CmzsBriFuHVNRHoUnbNhqReRKLEiCKM6yNQ8SMSPxs");
const bridgeAssociatedAccount = new PublicKey("GfZrDwCRLZtdhJuHytCwYP7VLguN2e5UjZWgV9YTLos4");

const getFeePayer = async () => {
  let secretKeyString = await readFile("/Users/billy/.config/solana/id.json", {
    encoding: "utf8",
  });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const feePayer = Keypair.fromSecretKey(secretKey);

  return feePayer;
};

const getConnection = () => {
  if (NETWORK == "localhost") {
    return new Connection("http://127.0.0.1:8899");
  }

  return new Connection("https://api.devnet.solana.com");
};

const getTxUrl = (txid: string) => {
  if (NETWORK == "localhost") {
    return `http://localhost:3000/tx/${txid}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`;
  }

  if (NETWORK == "devnet") {
    return `https://explorer.solana.com/tx/${txid}?cluster=custom&customUrl=devnet`;
  }

  return null;
};

export {
  getFeePayer,
  getConnection,
  bridgeProgramId,
  mintPubkey,
  getTxUrl,
  ownerAssociatedAccount,
  bridgeAssociatedAccount,
}
