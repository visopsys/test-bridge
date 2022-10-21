import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import {
  readFile,
} from "mz/fs";
import dotenv from 'dotenv';
dotenv.config();

const NETWORK = "localhost";

const bridgeProgramId = new PublicKey(String(process.env.BRIDGE_PROGRAM_ID!));
const mintPubkey = new PublicKey(String(process.env.MINT_PUBKEY!));
const ownerAssociatedAccount = new PublicKey(String(process.env.OWNER_ATA!));
const bridgeAssociatedAccount = new PublicKey(String(process.env.BRIDGE_ATA!));

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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function accountExisted(connection: Connection, pubkey: PublicKey): Promise<boolean> {
  let account = await connection.getAccountInfo(pubkey, "confirmed");
  if (account) {
    return true;
  }

  return false;
}

export {
  getFeePayer,
  getConnection,
  bridgeProgramId,
  mintPubkey,
  getTxUrl,
  ownerAssociatedAccount,
  bridgeAssociatedAccount,
  sleep,
  accountExisted,
}
