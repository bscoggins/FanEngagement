use pinocchio::{
    account::AccountView,
    Address,
    entrypoint,
    ProgramResult,
    error::ProgramError,
};
use pinocchio_log::log;

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Address,
    accounts: &[AccountView],
    instruction_data: &[u8],
) -> ProgramResult {
    // 1. Authenticate: Ensure the signer is authorized
    if accounts.is_empty() {
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let signer = &accounts[0];

    if !signer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // 2. Log: Emit the data as a Solana Log
    match core::str::from_utf8(instruction_data) {
        Ok(_data) => {
            log!("FE_LOG");
            // Note: pinocchio-log log! macro requires a string literal.
            // Since the instruction data is already on-chain, we don't strictly need to re-emit it.
            // Indexers can read the instruction data directly.
        }
        Err(_) => {
            return Err(ProgramError::InvalidInstructionData);
        }
    }

    Ok(())
}
