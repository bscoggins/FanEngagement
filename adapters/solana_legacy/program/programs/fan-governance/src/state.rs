use anchor_lang::prelude::*;

/// Organization account - root account for an organization
#[account]
pub struct OrganizationAccount {
    pub organization_id: [u8; 16],  // UUID (16 bytes)
    pub name: String,                // Max 100 chars
    pub created_at: i64,             // Unix timestamp
    pub authority: Pubkey,           // Organization admin (upgradeable)
    pub proposal_count: u32,         // Total proposals created
    pub bump: u8,                    // PDA bump seed
}

impl OrganizationAccount {
    pub const MAX_NAME_LENGTH: usize = 100;
    pub const LEN: usize = 8 +      // discriminator
        16 +                         // organization_id
        4 + Self::MAX_NAME_LENGTH + // name (String)
        8 +                          // created_at
        32 +                         // authority
        4 +                          // proposal_count
        1;                           // bump
}

/// Proposal status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Copy, Debug)]
pub enum ProposalStatus {
    Draft = 0,
    Open = 1,
    Closed = 2,
    Finalized = 3,
}

/// Proposal account - stores proposal metadata and lifecycle state
#[account]
pub struct ProposalAccount {
    pub proposal_id: [u8; 16],            // UUID (16 bytes)
    pub organization_id: [u8; 16],        // UUID (16 bytes)
    pub title: String,                     // Max 200 chars (truncated if needed)
    pub content_hash: [u8; 32],           // SHA-256 hash of proposal content
    pub status: ProposalStatus,            // Enum: Draft, Open, Closed, Finalized
    pub start_at: Option<i64>,             // Unix timestamp (nullable)
    pub end_at: Option<i64>,              // Unix timestamp (nullable)
    pub eligible_voting_power: u64,        // Snapshot at proposal open
    pub quorum_requirement: Option<u16>,   // Percentage (0-10000 = 0.00%-100.00%)
    pub created_by: Pubkey,                // Creator's wallet (or adapter signer)
    pub created_at: i64,                   // Unix timestamp
    pub updated_at: i64,                   // Unix timestamp
    pub bump: u8,                          // PDA bump seed
}

impl ProposalAccount {
    pub const MAX_TITLE_LENGTH: usize = 200;
    pub const MAX_QUORUM: u16 = 10000; // 100.00%
    pub const LEN: usize = 8 +      // discriminator
        16 +                         // proposal_id
        16 +                         // organization_id
        4 + Self::MAX_TITLE_LENGTH + // title (String)
        32 +                         // content_hash
        1 +                          // status (enum)
        1 + 8 +                      // start_at (Option<i64>)
        1 + 8 +                      // end_at (Option<i64>)
        8 +                          // eligible_voting_power
        1 + 2 +                      // quorum_requirement (Option<u16>)
        32 +                         // created_by
        8 +                          // created_at
        8 +                          // updated_at
        1;                           // bump
}

/// Proposal results account - stores cryptographic commitment of vote results
#[account]
pub struct ProposalResultsAccount {
    pub proposal_id: [u8; 16],             // UUID (16 bytes)
    pub results_hash: [u8; 32],           // SHA-256 hash of results JSON
    pub winning_option_id: Option<[u8; 16]>, // UUID of winning option (nullable)
    pub total_votes_cast: u64,             // Total voting power cast
    pub quorum_met: bool,                  // Whether quorum requirement was satisfied
    pub closed_at: i64,                    // Unix timestamp
    pub finalized_at: Option<i64>,         // Unix timestamp (nullable)
    pub bump: u8,                          // PDA bump seed
}

impl ProposalResultsAccount {
    pub const LEN: usize = 8 +      // discriminator
        16 +                         // proposal_id
        32 +                         // results_hash
        1 + 16 +                     // winning_option_id (Option<[u8; 16]>)
        8 +                          // total_votes_cast
        1 +                          // quorum_met
        8 +                          // closed_at
        1 + 8 +                      // finalized_at (Option<i64>)
        1;                           // bump
}

