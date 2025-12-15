#![allow(unexpected_cfgs)]
#![allow(ambiguous_glob_reexports)]
#![allow(unused_imports)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("53kLd3Zo8gqPyHuuALc1fLoARPszVkheA4P859MtfPo");

#[program]
pub mod fan_governance {
    use super::*;

    /// Creates a new organization account on-chain
    pub fn create_organization(
        ctx: Context<CreateOrganization>,
        organization_id: [u8; 16],
        name: String,
    ) -> Result<()> {
        instructions::create_organization::handler(ctx, organization_id, name)
    }

    /// Creates a new proposal account on-chain
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        proposal_id: [u8; 16],
        organization_id: [u8; 16],
        title: String,
        content_hash: [u8; 32],
        start_at: Option<i64>,
        end_at: Option<i64>,
        eligible_voting_power: u64,
        quorum_requirement: Option<u16>,
    ) -> Result<()> {
        instructions::create_proposal::handler(
            ctx,
            proposal_id,
            organization_id,
            title,
            content_hash,
            start_at,
            end_at,
            eligible_voting_power,
            quorum_requirement,
        )
    }

    /// Updates proposal status through lifecycle states
    pub fn update_proposal_status(
        ctx: Context<UpdateProposalStatus>,
        new_status: ProposalStatus,
    ) -> Result<()> {
        instructions::update_proposal_status::handler(ctx, new_status)
    }

    /// Commits vote results to on-chain storage
    pub fn commit_vote_results(
        ctx: Context<CommitVoteResults>,
        results_hash: [u8; 32],
        winning_option_id: Option<[u8; 16]>,
        total_votes_cast: u64,
        quorum_met: bool,
    ) -> Result<()> {
        instructions::commit_vote_results::handler(
            ctx,
            results_hash,
            winning_option_id,
            total_votes_cast,
            quorum_met,
        )
    }

    /// Finalizes a proposal (terminal state)
    pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
        instructions::finalize_proposal::handler(ctx)
    }
}

