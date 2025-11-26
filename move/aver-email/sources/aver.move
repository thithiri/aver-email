// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module app::aver;

use enclave::enclave::{Self, Enclave};
use std::string::String;

/// ====
/// Core onchain app logic, replace it with your own.
/// ====
///

const AVER_INTENT: u8 = 0;
const EInvalidSignature: u64 = 1;

public struct AverNFT has key, store {
    id: UID,
    dkim_total_count: u64,
    dkim_verified_count: u64,
    regex_validations_count: u64,
    timestamp_ms: u64,
}

/// Should match the inner struct T used for IntentMessage<T> in Rust.
/// Corresponds to DkimVerifyResult in Rust
public struct AverResponse has copy, drop {
    dkim_total_count: u64,
    dkim_verified_count: u64,
    regex_validations_count: u64,
}

public struct AVER has drop {}

fun init(otw: AVER, ctx: &mut TxContext) {
    let cap = enclave::new_cap(otw, ctx);

    cap.create_enclave_config(
        b"aver enclave".to_string(),
        x"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", // pcr0
        x"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", // pcr1
        x"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", // pcr2
        ctx,
    );

    transfer::public_transfer(cap, ctx.sender())
}

public fun update_aver<T>(
    dkim_total_count: u64,
    dkim_verified_count: u64,
    regex_validations_count: u64,
    timestamp_ms: u64,
    sig: &vector<u8>,
    enclave: &Enclave<T>,
    ctx: &mut TxContext,
): AverNFT {
    let res = enclave.verify_signature(
        AVER_INTENT,
        timestamp_ms,
        AverResponse { dkim_total_count, dkim_verified_count, regex_validations_count },
        sig,
    );
    assert!(res, EInvalidSignature);
    // Mint NFT with DKIM verification results
    AverNFT {
        id: object::new(ctx),
        dkim_total_count,
        dkim_verified_count,
        regex_validations_count,
        timestamp_ms,
    }
}
