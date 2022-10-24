package types

import (
	"fmt"
	"math/big"

	"github.com/gagliardetto/solana-go"
	"github.com/near/borsh-go"
)

type TransferOutData struct {
	Amount       big.Int
	TokenAddress string
	ChainId      uint64
	Recipient    string
}

type TransferOutInstruction struct {
	programId       solana.PublicKey
	accounts        []*solana.AccountMeta
	transferOutData TransferOutData
}

func NewTransferOutInstruction(programId solana.PublicKey, accounts []*solana.AccountMeta,
	transferOutData TransferOutData) *TransferOutInstruction {
	return &TransferOutInstruction{
		programId:       programId,
		accounts:        accounts,
		transferOutData: transferOutData,
	}
}

// ProgramID is the programID the instruction acts on
func (ix *TransferOutInstruction) ProgramID() solana.PublicKey {
	return ix.programId
}

// Accounts returns the list of accounts the instructions requires
func (ix *TransferOutInstruction) Accounts() []*solana.AccountMeta {
	return ix.accounts
}

func (ix *TransferOutInstruction) Data() ([]byte, error) {
	bz, err := borsh.Serialize(ix.transferOutData)
	if err != nil {
		return nil, err
	}

	fmt.Println("ix.transferOutData bz = ", bz)

	ret := append([]byte{1}, bz...)

	return ret, err
}
