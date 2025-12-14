use anchor_lang::prelude::*;

#[error_code]
pub enum GovernanceError {
    #[msg("Title exceeds maximum length")]
    TitleTooLong,
    
    #[msg("Name exceeds maximum length")]
    NameTooLong,
    
    #[msg("Invalid state transition")]
    InvalidStateTransition,
    
    #[msg("Invalid quorum requirement (must be 0-10000)")]
    InvalidQuorumRequirement,
    
    #[msg("Start time must be before end time")]
    InvalidTimeRange,
    
    #[msg("Proposal must be closed before committing results")]
    ProposalNotClosed,
    
    #[msg("Proposal must be closed before finalizing")]
    ProposalNotClosedForFinalization,
    
    #[msg("Results account already exists")]
    ResultsAlreadyExists,
    
    #[msg("Results account does not exist")]
    ResultsNotFound,
    
    #[msg("Unauthorized: not the organization authority")]
    Unauthorized,
    
    #[msg("Organization account not found")]
    OrganizationNotFound,
    
    #[msg("Proposal account not found")]
    ProposalNotFound,
}

