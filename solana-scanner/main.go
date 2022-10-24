package main

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"os"

	confirm "github.com/gagliardetto/solana-go/rpc/sendAndConfirmTransaction"
	"github.com/gagliardetto/solana-go/rpc/ws"
	"github.com/gagliardetto/solana-go/text"
	"github.com/joho/godotenv"

	"github.com/akamensky/base58"
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/near/borsh-go"
	"github.com/visopsys/solana-scanner/types"
	"github.com/ybbus/jsonrpc/v3"
)

const PROGRAM_ID = "HguMTvmDfspHuEWycDSP1XtVQJi47hVNAyLbFEf2EJEQ"

type GetBlockRequest struct {
	TransactionDetails string `json:"transactionDetails"`
}

type Instruction struct {
	ProgramIdIndex int    `json:"programIdIndex"`
	Accounts       []int  `json:"accounts"`
	Data           string `json:"data"`
}

type TransactionMeta struct {
	Fee uint64 `json:"fee"`
}

type TransactionMessage struct {
	AccountKeys  []string      `json:"accountKeys"`
	Instructions []Instruction `json:"instructions"`
}

type TransactionInner struct {
	Signatures []string           `json:"signatures"`
	Message    TransactionMessage `json:"Message"`
}

type Transaction struct {
	Meta             TransactionMeta  `json:"meta"`
	TransactionInner TransactionInner `json:"transaction"`
}

type Block struct {
	BlockHeight  int           `json:"blockHeight"`
	Transactions []Transaction `json:"transactions"`
}

type TransferOutData struct {
	Amount       big.Int
	TokenAddress string
	ChainId      uint64
	Recipient    string
}

func GetBlock(rpcClient jsonrpc.RPCClient, blockNumber int) *Block {
	var request = &GetBlockRequest{
		TransactionDetails: "full",
	}

	res, err := rpcClient.Call(context.Background(), "getBlock", blockNumber, request)
	if err != nil {
		panic(err)
	}

	block := new(Block)
	err = res.GetObject(&block)
	if err != nil {
		panic(err)
	}

	fmt.Println("Transactions = ", block.Transactions[len(block.Transactions)-1].TransactionInner.Message.Instructions[0].Data)

	return block
}

func getPrivateKey() solana.PrivateKey {
	key, err := solana.PrivateKeyFromSolanaKeygenFile(os.Getenv("KEY_PATH"))
	if err != nil {
		panic(err)
	}

	return key
}

func TestSolanaGo() {
	endpoint := rpc.DevNet_RPC
	client := rpc.New(endpoint)

	// Create a new WS client (used for confirming transactions)
	wsClient, err := ws.Connect(context.Background(), rpc.DevNet_WS)
	if err != nil {
		panic(err)
	}

	feePayer := getPrivateKey()

	bridgeProgramId := solana.MustPublicKeyFromBase58(os.Getenv("BRIDGE_PROGRAM_ID"))
	tokenProgramId := solana.MustPublicKeyFromBase58("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
	ownerAta := solana.MustPublicKeyFromBase58(os.Getenv("OWNER_ATA"))
	bridgeAta := solana.MustPublicKeyFromBase58(os.Getenv("BRIDGE_ATA"))
	bridgePda, _, err := solana.FindProgramAddress([][]byte{[]byte("SisuBridge")}, bridgeProgramId)
	if err != nil {
		panic(err)
	}
	fmt.Println("bridgePda = ", bridgePda)
	fmt.Println("feePayer = ", feePayer.PublicKey())

	// {
	// 	pubkey: feePayer.publicKey,
	// 	isSigner: true,
	// 	isWritable: false,
	// },
	// {
	// 	pubkey: TOKEN_PROGRAM_ID,
	// 	isSigner: false,
	// 	isWritable: false,
	// },
	// {
	// 	pubkey: ownerAssociatedAccount,
	// 	isSigner: false,
	// 	isWritable: true,
	// },
	// {
	// 	pubkey: bridgeAssociatedAccount,
	// 	isSigner: false,
	// 	isWritable: true,
	// },
	// {
	// 	pubkey: bridgePda,
	// 	isSigner: false,
	// 	isWritable: true,
	// },

	accounts := []*solana.AccountMeta{
		solana.NewAccountMeta(feePayer.PublicKey(), false, true),
		solana.NewAccountMeta(tokenProgramId, false, false),
		solana.NewAccountMeta(ownerAta, true, false),
		solana.NewAccountMeta(bridgeAta, true, false),
		solana.NewAccountMeta(bridgePda, true, false),
	}

	data := types.TransferOutData{
		Amount:       *big.NewInt(900),
		TokenAddress: "0x1234",
		ChainId:      123,
		Recipient:    "someone",
	}

	ix := types.NewTransferOutInstruction(bridgeProgramId, accounts, data)
	// bz, err := ix.Data()
	// if err != nil {
	// 	panic(err)
	// }
	// dataHex := hex.EncodeToString(bz)
	// fmt.Println("bz = ", bz)

	// Block hash
	result, err := client.GetRecentBlockhash(context.Background(), rpc.CommitmentFinalized)
	if err != nil {
		panic(err)
	}

	// result.Value.Blockhash = solana.MustHashFromBase58("GCvmaP5BFXPZvcrEh3PVpfmhbFfnsMAeaBkcN5V83Zr9")

	// // Build transaction
	// builder := solana.NewTransactionBuilder()
	// builder.AddInstruction(ix)
	// builder.SetFeePayer(feePayer.PublicKey())
	// builder.SetRecentBlockHash(result.Value.Blockhash)
	// tx, err := builder.Build()
	// if err != nil {
	// 	panic(err)
	// }

	tx, err := solana.NewTransaction(
		[]solana.Instruction{ix},
		result.Value.Blockhash,
		solana.TransactionPayer(feePayer.PublicKey()),
	)
	if err != nil {
		panic(err)
	}

	fmt.Println("tx.Message.RecentBlockhash = ", tx.Message.RecentBlockhash)

	tx.Sign(
		func(key solana.PublicKey) *solana.PrivateKey {
			if feePayer.PublicKey().Equals(key) {
				return &feePayer
			}
			fmt.Println("Private key is nil for ", key)
			return nil
		},
	)

	// fmt.Println("sinatures = ", tx.Signatures)
	// bz, err := tx.Message.MarshalBinary()
	// if err != nil {
	// 	panic(err)
	// }
	// fmt.Println("message serialize = ", bz)

	// spew.Dump(tx)
	// Pretty print the transaction:
	tx.EncodeTree(text.NewTreeEncoder(os.Stdout, "Transfer Token out"))

	// Send transaction, and wait for confirmation:
	sig, err := confirm.SendAndConfirmTransaction(
		context.Background(),
		client,
		wsClient,
		tx,
	)
	fmt.Println("sig = ", sig)
	if err != nil {
		panic(err)
	}
	_ = sig
	// spew.Dump(sig)
}

func processBlock(block *Block) {
	for _, tx := range block.Transactions {
		for _, ix := range tx.TransactionInner.Message.Instructions {
			if tx.TransactionInner.Message.AccountKeys[ix.ProgramIdIndex] == PROGRAM_ID {
				// This is an instruction on our program.
				fmt.Println(ix.Data)
				bytesArr, err := base58.Decode(ix.Data)
				if err != nil {
					panic(err)
				}

				borshBz := bytesArr[1:]
				transferData := new(TransferOutData)
				err = borsh.Deserialize(transferData, borshBz)
				if err != nil {
					panic(err)
				}

				fmt.Println(*transferData)
			}
		}
	}
}

func testProcessBlock() {
	// rpcClient := jsonrpc.NewClient("http://127.0.0.1:8899")
	rpcClient := jsonrpc.NewClient("https://api.devnet.solana.com")

	start := 170525051
	block := GetBlock(rpcClient, start)
	processBlock(block)
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	TestSolanaGo()
}
