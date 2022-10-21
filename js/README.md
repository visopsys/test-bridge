- Open a new window and run solana-test-validator (you can reset the chain by deleting test-ledger folder)

- Deploy Rust program and get the token id.

- Run
```
npx ts-node gen-data.ts PROGRAM_ID
```

This command does the following:
1) Create token
2) Initialize bridge pda
3) Create associated token address for owner and bridge
4) Update bridgeProgramId, mintPubkey, ownerAssociatedAccount, bridgeAssociatedAccount in ".env"
5) Mint token to the owner
6) Approve bridge for token transfer
7) Call initialize instruction of the bridge
8) Call Transfer token.

- Copy the variables to the .env file.
