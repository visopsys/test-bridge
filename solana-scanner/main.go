package main

import (
	"context"
	"fmt"
	"math/big"

	"github.com/akamensky/base58"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/near/borsh-go"
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

func TestSolanaGo() {
	endpoint := rpc.TestNet_RPC
	_ = rpc.New(endpoint)
	// client.GetConfirmedBlock()
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

func main() {
	// rpcClient := jsonrpc.NewClient("http://127.0.0.1:8899")
	rpcClient := jsonrpc.NewClient("https://api.devnet.solana.com")

	start := 170525051
	block := GetBlock(rpcClient, start)
	processBlock(block)
}
