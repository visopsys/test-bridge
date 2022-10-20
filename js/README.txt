Open a new window and run solana-test-validator (you can reset the chain by deleting test-ledger folder)

On a separate window:
) Create token
) Initialize bridge pda
) Create associated token address for owner and bridge
) Update bridgeProgramId, mintPubkey, ownerAssociatedAccount, bridgeAssociatedAccount in "common.ts"
) Mint token to the owner
) Approve bridge for token transfer
) Call initialize instruction of the bridge
) Call Transfer token.
