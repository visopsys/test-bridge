package types

import (
	"fmt"
	"math/big"
	"testing"

	"github.com/near/borsh-go"
	"github.com/stretchr/testify/assert"
)

func TestSerializeData(t *testing.T) {
	data := TransferOutData{
		Amount:       *big.NewInt(900),
		TokenAddress: "0x1234",
		ChainId:      123,
		Recipient:    "someone",
	}

	encoded, err := borsh.Serialize(data)
	if err != nil {
		panic(err)
	}

	fmt.Println("encoded = ", encoded)

	decoded := TransferOutData{}
	err = borsh.Deserialize(&decoded, encoded)
	if err != nil {
		panic(err)
	}

	assert.Equal(t, data, decoded)
}
