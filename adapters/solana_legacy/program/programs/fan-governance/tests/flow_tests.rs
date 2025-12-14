use anchor_lang::prelude::{AccountDeserialize, Pubkey};
use anchor_lang::{system_program, InstructionData, ToAccountMetas};
use fan_governance::state::{OrganizationAccount, ProposalAccount, ProposalResultsAccount, ProposalStatus};
use solana_program_test::ProgramTest;
use solana_sdk::{signer::Signer, transaction::Transaction};

// Integration flow: create org -> create proposal -> open -> close -> commit results -> finalize.
#[tokio::test]
async fn full_governance_flow_executes_on_chain() {
    // Use the compiled BPF artifact from target/deploy via the default loader.
    std::env::set_var("BPF_OUT_DIR", "../../target/deploy");
    let mut program_test = ProgramTest::default();
    program_test.prefer_bpf(true);
    program_test.add_program("fan_governance", fan_governance::id(), None);

    // Faster tests
    program_test.set_compute_max_units(200_000);

    let (banks_client, payer, recent_blockhash) = program_test.start().await;

    // PDAs
    let organization_id: [u8; 16] = *b"org-123456789012";
    let proposal_id: [u8; 16] = *b"proposal-uuid-01";

    let (organization_pda, organization_bump) =
        Pubkey::find_program_address(&[b"organization", organization_id.as_ref()], &fan_governance::id());
    let (proposal_pda, proposal_bump) = Pubkey::find_program_address(
        &[b"proposal", organization_pda.as_ref(), &proposal_id],
        &fan_governance::id(),
    );
    let (results_pda, results_bump) =
        Pubkey::find_program_address(&[b"proposal_results", proposal_pda.as_ref()], &fan_governance::id());

    // 1) create_organization
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
            name: "Test Org".to_string(),
        }
        .data(),
    };

    // 2) create_proposal
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
            title: "Test Proposal".to_string(),
            content_hash: [7u8; 32],
            start_at: Some(1),
            end_at: Some(2),
            eligible_voting_power: 10,
            quorum_requirement: Some(5000),
        }
        .data(),
    };

    // 3) open proposal
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

    // 4) close proposal
    let close_ix = solana_sdk::instruction::Instruction {
        program_id: fan_governance::id(),
        accounts: open_accounts.to_account_metas(None),
        data: fan_governance::instruction::UpdateProposalStatus {
            new_status: ProposalStatus::Closed,
        }
        .data(),
    };

    // 5) commit vote results
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
            winning_option_id: Some([1u8; 16]),
            total_votes_cast: 10,
            quorum_met: true,
        }
        .data(),
    };

    // 6) finalize
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

    // Execute the flow in separate transactions to mirror real usage
    for ix in [org_ix, proposal_ix, open_ix, close_ix, commit_ix, finalize_ix] {
        let tx = Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], recent_blockhash);
        banks_client.process_transaction(tx).await.unwrap();
    }

    // Assert proposal state finalized
    let proposal_account = banks_client
        .get_account(proposal_pda)
        .await
        .expect("proposal fetch")
        .expect("proposal exists");
    let mut data: &[u8] = proposal_account.data.as_slice();
    let proposal: ProposalAccount = AccountDeserialize::try_deserialize(&mut data).unwrap();
    assert_eq!(proposal.status, ProposalStatus::Finalized);

    // Assert results stored
    let results_account = banks_client
        .get_account(results_pda)
        .await
        .expect("results fetch")
        .expect("results exists");
    let mut rdata: &[u8] = results_account.data.as_slice();
    let results: ProposalResultsAccount = AccountDeserialize::try_deserialize(&mut rdata).unwrap();
    assert_eq!(results.proposal_id, proposal_id);
    assert_eq!(results.results_hash, [9u8; 32]);
    assert_eq!(results.winning_option_id, Some([1u8; 16]));
    assert!(results.quorum_met);
    assert!(results.finalized_at.is_some());

    // Organization proposal_count incremented
    let org_account = banks_client
        .get_account(organization_pda)
        .await
        .expect("org fetch")
        .expect("org exists");
    let mut odata: &[u8] = org_account.data.as_slice();
    let org: OrganizationAccount = AccountDeserialize::try_deserialize(&mut odata).unwrap();
    assert_eq!(org.proposal_count, 1);
    assert_eq!(org.bump, organization_bump);
    assert_eq!(proposal.bump, proposal_bump);
    assert_eq!(results.bump, results_bump);
}
