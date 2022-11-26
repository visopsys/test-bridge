use core::slice::Iter;

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction, system_program,
    sysvar::{rent::Rent, Sysvar},
};

use crate::error::BridgeError;
use crate::state::{
    AddSpenderData, BridgeInstruction, BridgeStateV0, TransferInIx, TransferOutData,
};

pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let data_vec = instruction_data.to_vec();
        assert!(data_vec.len() > 0, "Instruction data cannot be empty");

        let instruction = BridgeInstruction::try_from_slice(&[data_vec[0]])
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        let accounts_iter = &mut accounts.iter();

        match instruction {
            BridgeInstruction::Initialize => {
                return Processor::initialize(accounts_iter, program_id);
            }

            BridgeInstruction::TransferOut => {
                return Processor::transfer_out(accounts_iter, data_vec);
            }

            BridgeInstruction::TransferIn => {
                return Processor::transfer_in(accounts_iter, data_vec);
            }

            BridgeInstruction::AddSpender => {
                return Processor::add_spender(accounts_iter, data_vec);
            }

            BridgeInstruction::RemoveSpender => Err(BridgeError::NotImplemented.into()),
            BridgeInstruction::ChangeAdmin => Err(BridgeError::NotImplemented.into()),
        }
    }

    fn initialize(accounts_iter: &mut Iter<AccountInfo>, program_id: &Pubkey) -> ProgramResult {
        let user = next_account_info(accounts_iter)?;
        let bridge_pda = next_account_info(accounts_iter)?;
        let sys_program = next_account_info(accounts_iter)?;

        let seed_string = b"SisuBridge";

        // Verification
        assert!(user.is_signer, "initialize: User must sign the message");
        assert!(
            bridge_pda.is_writable,
            "initialize: Bridge pda must be writable"
        );
        assert_eq!(bridge_pda.owner, &system_program::ID);
        assert!(system_program::check_id(sys_program.key));

        // Check that the bridge pda matches the expected pda.
        let (calculated_pda, bump) = Pubkey::find_program_address(&[seed_string], program_id);
        assert_eq!(bridge_pda.key, &calculated_pda);

        // Create the pda account
        invoke_signed(
            &system_instruction::create_account(
                user.key,
                bridge_pda.key,
                Rent::get()?.minimum_balance(99),
                99,
                &program_id,
            ),
            // making sure downstream program has all necessary data
            &[user.clone(), bridge_pda.clone(), sys_program.clone()],
            &[&[seed_string, &[bump]]], // signature
        )?;

        let bridge_state = BridgeStateV0 {
            version: 0,
            bump,
            admin: *user.key,
            spenders: [*user.key, *user.key],
            spender_index: 0,
        };

        msg!("Bridge admin = {:?}", user.key);

        bridge_state.serialize(&mut *bridge_pda.data.borrow_mut())?;

        Ok(())
    }

    fn transfer_out(accounts_iter: &mut Iter<AccountInfo>, data_vec: Vec<u8>) -> ProgramResult {
        let user = next_account_info(accounts_iter)?;
        let token_program_ai = next_account_info(accounts_iter)?;
        let user_associated_token = next_account_info(accounts_iter)?;
        let bridge_associated_token = next_account_info(accounts_iter)?;
        let bridge_pda = next_account_info(accounts_iter)?;

        msg!(
            "userATA = {:?}, bridgeAta = {:?}",
            user_associated_token.key,
            bridge_associated_token.key
        );

        // Validation
        assert!(user.is_signer, "transfer_out: User must sign the message");

        // Payload
        let payload = TransferOutData::try_from_slice(&data_vec[1..]).unwrap();
        msg!(
            "Recipient = {:?} -- Amount = {:?}",
            payload.recipient,
            payload.amount
        );

        // Transfer token to this bridge account.
        let bridge_state = BridgeStateV0::try_from_slice(&bridge_pda.data.borrow())?;
        invoke_signed(
            &spl_token::instruction::transfer(
                &spl_token::ID,
                user_associated_token.key,
                bridge_associated_token.key,
                bridge_pda.key,
                &[bridge_pda.key],
                payload.amount,
            )?,
            &[
                user_associated_token.clone(),
                bridge_associated_token.clone(),
                bridge_pda.clone(),
                token_program_ai.clone(),
            ],
            &[&[b"SisuBridge", &[bridge_state.bump]]],
        )?;

        Ok(())
    }

    fn transfer_in(accounts_iter: &mut Iter<AccountInfo>, data_vec: Vec<u8>) -> ProgramResult {
        // Authority checking. Make sure the caller is the spender or owner of this bridge pda.
        let bridge_spender = next_account_info(accounts_iter)?;
        let token_program_ai = next_account_info(accounts_iter)?;
        let bridge_pda = next_account_info(accounts_iter)?;

        let bridge_state = BridgeStateV0::try_from_slice(&bridge_pda.data.borrow())?;

        msg!("In the transfer in ....");

        // Verify that this message is signed by the user.
        assert!(
            bridge_spender.is_signer,
            "transfer_in: User must sign the message"
        );

        // Check that user is one of the spenders
        let mut found = false;
        for spender in bridge_state.spenders {
            if spender == *bridge_spender.key {
                found = true;
                break;
            }
        }
        if found == false {
            return Err(BridgeError::NotAnAdmin.into());
        }

        // Verify that all the tokens must be valid and the bridge has account for each tokens.
        let transfer_in = TransferInIx::try_from_slice(&data_vec)
            .unwrap()
            .transfer_data;
        assert!(
            transfer_in.amounts.len() > 0,
            "amount array length should be positive"
        );

        for item in transfer_in.amounts.into_iter().enumerate() {
            let (_, amount): (usize, u64) = item;
            assert!(amount > 0, "Amount must be positive!");

            let bridge_ata = next_account_info(accounts_iter)?;
            let receiver_ata = next_account_info(accounts_iter)?;

            // assert_eq!(
            //     bridge_ata.owner, bridge_pda.key,
            //     "transfer_in: Bridge pda must be the owner of the bridge ata for transfer index {}", i
            // );

            // Transfer token from bridge to user.
            invoke_signed(
                &spl_token::instruction::transfer(
                    &spl_token::ID,
                    bridge_ata.key,
                    receiver_ata.key,
                    bridge_pda.key,
                    &[bridge_pda.key],
                    amount,
                )?,
                &[
                    bridge_ata.clone(),
                    receiver_ata.clone(),
                    bridge_pda.clone(),
                    token_program_ai.clone(),
                ],
                &[&[b"SisuBridge", &[bridge_state.bump]]],
            )?;
        }

        Ok(())
    }

    fn add_spender(accounts_iter: &mut Iter<AccountInfo>, data_vec: Vec<u8>) -> ProgramResult {
        let user = next_account_info(accounts_iter)?;
        let bridge_pda = next_account_info(accounts_iter)?;
        assert!(user.is_signer, "add_spender: User must sign the message");

        // Get the bridge state.
        let mut bridge_state = BridgeStateV0::try_from_slice(&bridge_pda.data.borrow())?;

        // Validation
        assert_eq!(
            user.key, &bridge_state.admin,
            "add_spender: user is not an admin"
        );
        assert_eq!(bridge_state.spenders.len(), 2);

        // Update spender
        let new_spender = AddSpenderData::try_from_slice(&data_vec).unwrap().spender;
        let index = bridge_state.spender_index;
        bridge_state.spenders[((index + 1) % 2) as usize] = new_spender;

        // Serialize back to the bridge pda.
        bridge_state.serialize(&mut *bridge_pda.data.borrow_mut())?;

        Ok(())
    }
}
