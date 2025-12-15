use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(
    results_hash: [u8; 32],
    winning_option_id: Option<[u8; 16]>,
    total_votes_cast: u64,
    quorum_met: bool
)]
pub struct CommitVoteResults<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProposalResultsAccount::LEN,
        seeds = [
            b"proposal_results",
            proposal.key().as_ref()
        ],
        bump
    )]
    pub results: Account<'info, ProposalResultsAccount>,
    
    #[account(
        mut,
        constraint = proposal.status == ProposalStatus::Closed @ GovernanceError::ProposalNotClosed
    )]
    pub proposal: Account<'info, ProposalAccount>,
    
    #[account(
        seeds = [
            b"organization",
            &proposal.organization_id
        ],
        bump = organization.bump
    )]
    pub organization: Account<'info, OrganizationAccount>,
    
    #[account(
        mut,
        constraint = organization.authority == authority.key() @ GovernanceError::Unauthorized
    )]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CommitVoteResults>,
    results_hash: [u8; 32],
    winning_option_id: Option<[u8; 16]>,
    total_votes_cast: u64,
    quorum_met: bool,
) -> Result<()> {
    let proposal = &ctx.accounts.proposal;
    let results = &mut ctx.accounts.results;
    let clock = Clock::get()?;
    
    // Set results data
    results.proposal_id = proposal.proposal_id;
    results.results_hash = results_hash;
    results.winning_option_id = winning_option_id;
    results.total_votes_cast = total_votes_cast;
    results.quorum_met = quorum_met;
    results.closed_at = clock.unix_timestamp;
    results.finalized_at = None;
    results.bump = ctx.bumps.results;
    
    msg!("Vote results committed for proposal: {:?}", proposal.proposal_id);
    msg!("Results hash: {:?}", results_hash);
    msg!("Quorum met: {}", quorum_met);
    
    Ok(())
}

