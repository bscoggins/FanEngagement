use anchor_lang::prelude::{AccountDeserialize, Pubkey};
use anchor_lang::{system_program, InstructionData, ToAccountMetas};
use fan_governance::state::{OrganizationAccount, ProposalAccount, ProposalResultsAccount, ProposalStatus};
use solana_client::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::{signature::read_keypair_file, signer::Signer, transaction::Transaction};

// Live RPC flow against an external validator (docker solana-test-validator).
// Requires env:
// RUN_LIVE_VALIDATOR_TEST=1
// SOLANA_RPC_URL (default http://127.0.0.1:8899)
// SOLANA_PAYER_KEYPAIR path to a funded keypair (from deploy script)
#[test]
fn live_validator_flow() {
    if std::env::var("RUN_LIVE_VALIDATOR_TEST").ok().as_deref() != Some("1") {
        eprintln!("skipping live validator flow; set RUN_LIVE_VALIDATOR_TEST=1");
        return;
    }

    let rpc_url = std::env::var("SOLANA_RPC_URL").unwrap_or_else(|_| "http://127.0.0.1:8899".to_string());
    let payer_path = std::env::var("SOLANA_PAYER_KEYPAIR").expect("SOLANA_PAYER_KEYPAIR required");
    let payer = read_keypair_file(payer_path).expect("read payer keypair");
    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::processed());
    println!("rpc_url={} payer={}", client.url(), payer.pubkey());

    // Ensure the payer exists and is funded on the target validator
    let mut funded = false;
    for _ in 0..20 {
        let airdrop_sig = client
            .request_airdrop(&payer.pubkey(), 2_000_000_000)
            .expect("airdrop request");
        let bh = client.get_latest_blockhash().expect("blockhash");
        client
            .confirm_transaction_with_spinner(
                &airdrop_sig,
                &bh,
                CommitmentConfig::processed(),
            )
            .expect("airdrop confirm");

        let balance = client.get_balance(&payer.pubkey()).expect("balance");
        if balance > 0 {
            funded = true;
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(250));
    }
    assert!(funded, "payer not funded after airdrop attempts");

    // PDAs
    let organization_id: [u8; 16] = *b"org-123456789012";
    let proposal_id: [u8; 16] = *b"proposal-uuid-02";

    let (organization_pda, organization_bump) =
        Pubkey::find_program_address(&[b"organization", organization_id.as_ref()], &fan_governance::id());
    let (proposal_pda, proposal_bump) = Pubkey::find_program_address(
        &[b"proposal", organization_pda.as_ref(), &proposal_id],
        &fan_governance::id(),
    );
    let (results_pda, results_bump) =
        Pubkey::find_program_address(&[b"proposal_results", proposal_pda.as_ref()], &fan_governance::id());

    // Build instructions
    let org_accounts = fan_governance::accounts::CreateOrganization {
        organization: organization_pda,
        authority: payer.pubkey(),
        system_program: system_program::ID,
    };
    let org_ix = solana_sdk::instruction::Instruction {
        program_id: fan_governance::id(),
        accounts: org_accounts.to_account_metas(None),
        data: fan_governance::instruction::CreateOrganization {
            organization_id,
            name: "Live Org".to_string(),
        }
        .data(),
    };

    let proposal_accounts = fan_governance::accounts::CreateProposal {
        proposal: proposal_pda,
        organization: organization_pda,
        authority: payer.pubkey(),
        system_program: system_program::ID,
    };
    let proposal_ix = solana_sdk::instruction::Instruction {
        program_id: fan_governance::id(),
        accounts: proposal_accounts.to_account_metas(None),
        data: fan_governance::instruction::CreateProposal {
            proposal_id,
            organization_id,
            title: "Live Proposal".to_string(),
            content_hash: [1u8; 32],
            start_at: Some(1),
            end_at: Some(2),
            eligible_voting_power: 42,
            quorum_requirement: Some(5000),
        }
        .data(),
    };

    let open_accounts = fan_governance::accounts::UpdateProposalStatus {
        proposal: proposal_pda,
        organization: organization_pda,
        authority: payer.pubkey(),
        system_program: system_program::ID,
    };
    let open_ix = solana_sdk::instruction::Instruction {
        program_id: fan_governance::id(),
        accounts: open_accounts.to_account_metas(None),
        data: fan_governance::instruction::UpdateProposalStatus {
            new_status: ProposalStatus::Open,
        }
        .data(),
    };

    let close_ix = solana_sdk::instruction::Instruction {
        program_id: fan_governance::id(),
        accounts: open_accounts.to_account_metas(None),
        data: fan_governance::instruction::UpdateProposalStatus {
            new_status: ProposalStatus::Closed,
        }
        .data(),
    };

    let results_accounts = fan_governance::accounts::CommitVoteResults {
        results: results_pda,
        proposal: proposal_pda,
        organization: organization_pda,
        authority: payer.pubkey(),
        system_program: system_program::ID,
    };
    let commit_ix = solana_sdk::instruction::Instruction {
        program_id: fan_governance::id(),
        accounts: results_accounts.to_account_metas(None),
        data: fan_governance::instruction::CommitVoteResults {
            results_hash: [9u8; 32],
            winning_option_id: Some([2u8; 16]),
            total_votes_cast: 42,
            quorum_met: true,
        }
        .data(),
    };

    let finalize_accounts = fan_governance::accounts::FinalizeProposal {
        proposal: proposal_pda,
        results: results_pda,
        organization: organization_pda,
        authority: payer.pubkey(),
    };
    let finalize_ix = solana_sdk::instruction::Instruction {
        program_id: fan_governance::id(),
        accounts: finalize_accounts.to_account_metas(None),
        data: fan_governance::instruction::FinalizeProposal {}.data(),
    };

    let ixs = vec![org_ix, proposal_ix, open_ix, close_ix, commit_ix, finalize_ix];
    for ix in ixs {
        let bh = client.get_latest_blockhash().expect("blockhash");
        let tx = Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], bh);
        client.send_and_confirm_transaction(&tx).expect("tx");
    }

    // Verify accounts
    let proposal_account = client.get_account(&proposal_pda).expect("proposal fetch");
    let mut pdata: &[u8] = &proposal_account.data;
    let proposal: ProposalAccount = AccountDeserialize::try_deserialize(&mut pdata).expect("deserialize proposal");
    assert_eq!(proposal.status, ProposalStatus::Finalized);
    assert_eq!(proposal.bump, proposal_bump);

    let results_account = client.get_account(&results_pda).expect("results fetch");
    let mut rdata: &[u8] = &results_account.data;
    let results: ProposalResultsAccount = AccountDeserialize::try_deserialize(&mut rdata).expect("deserialize results");
    assert_eq!(results.proposal_id, proposal_id);
    assert_eq!(results.results_hash, [9u8; 32]);
    assert_eq!(results.winning_option_id, Some([2u8; 16]));
    assert!(results.quorum_met);
    assert!(results.finalized_at.is_some());
    assert_eq!(results.bump, results_bump);

    let org_account = client.get_account(&organization_pda).expect("org fetch");
    let mut odata: &[u8] = &org_account.data;
    let org: OrganizationAccount = AccountDeserialize::try_deserialize(&mut odata).expect("deserialize org");
    assert_eq!(org.proposal_count, 1);
    assert_eq!(org.bump, organization_bump);
}
