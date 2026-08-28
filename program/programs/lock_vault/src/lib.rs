use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("11111111111111111111111111111111111111111"); // replaced by `anchor keys sync` after the first build

/// Minimum lock size: 0.01 SOL.
pub const MIN_LOCK_LAMPORTS: u64 = 10_000_000;

/// Unlock fee tier boundaries, in lamports (inclusive upper bounds), each
/// paired with its basis-point rate. Fixed at compile time and not
/// adjustable by any admin instruction — see the project plan for why this
/// non-discretionary, non-custodial design matters legally: nobody but the
/// depositor can ever move these funds, the fee depends only on the amount
/// locked (never on contest outcome or any other participant), and the
/// schedule can't be tuned after the fact.
///   0.01–0.09 SOL → 1.0% (100 bps)
///   0.10–1.09 SOL → 0.5% (50 bps)
///   1.10 SOL+     → 0.2% (20 bps)
const TIER_1_MAX_LAMPORTS: u64 = 90_000_000; // 0.09 SOL
const TIER_1_FEE_BPS: u64 = 100;
const TIER_2_MAX_LAMPORTS: u64 = 1_090_000_000; // 1.09 SOL
const TIER_2_FEE_BPS: u64 = 50;
const TIER_3_FEE_BPS: u64 = 20;

fn fee_bps_for_amount(amount_lamports: u64) -> u64 {
    if amount_lamports <= TIER_1_MAX_LAMPORTS {
        TIER_1_FEE_BPS
    } else if amount_lamports <= TIER_2_MAX_LAMPORTS {
        TIER_2_FEE_BPS
    } else {
        TIER_3_FEE_BPS
    }
}

/// Fee destination — the operator's own wallet. Rebuild (`anchor build`) and
/// redeploy after ever changing this; it is not adjustable at runtime.
pub const TREASURY: Pubkey = pubkey!("49cQRProXVqA5eCXyZw1VCR73xcbq4s8kVnhWSvnNMPL");

#[program]
pub mod lock_vault {
    use super::*;

    pub fn lock(ctx: Context<Lock>, amount_lamports: u64) -> Result<()> {
        require!(amount_lamports >= MIN_LOCK_LAMPORTS, LockVaultError::AmountBelowMinimum);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount_lamports,
        )?;

        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.user.key();
        vault.locked_lamports = amount_lamports;
        vault.locked_at = Clock::get()?.unix_timestamp;
        vault.bump = ctx.bumps.vault;

        Ok(())
    }

    pub fn unlock(ctx: Context<Unlock>) -> Result<()> {
        let locked = ctx.accounts.vault.locked_lamports;
        let fee_bps = fee_bps_for_amount(locked);
        let fee = locked
            .checked_mul(fee_bps)
            .ok_or(LockVaultError::MathOverflow)?
            / 10_000;
        let payout = locked.checked_sub(fee).ok_or(LockVaultError::MathOverflow)?;

        {
            let vault_info = ctx.accounts.vault.to_account_info();
            let mut vault_lamports = vault_info.try_borrow_mut_lamports()?;
            **vault_lamports = vault_lamports
                .checked_sub(fee)
                .ok_or(LockVaultError::MathOverflow)?;
            let mut treasury_lamports = ctx.accounts.treasury.try_borrow_mut_lamports()?;
            **treasury_lamports = treasury_lamports
                .checked_add(fee)
                .ok_or(LockVaultError::MathOverflow)?;
        }
        {
            let vault_info = ctx.accounts.vault.to_account_info();
            let mut vault_lamports = vault_info.try_borrow_mut_lamports()?;
            **vault_lamports = vault_lamports
                .checked_sub(payout)
                .ok_or(LockVaultError::MathOverflow)?;
            let mut user_lamports = ctx.accounts.user.try_borrow_mut_lamports()?;
            **user_lamports = user_lamports
                .checked_add(payout)
                .ok_or(LockVaultError::MathOverflow)?;
        }

        // Remaining balance (the rent-exempt deposit) is swept to `user` by
        // the `close = user` constraint below.
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Lock<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = Vault::SPACE,
        seeds = [b"vault", user.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unlock<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        close = user,
        // Seeds are derived from the signer's own key, so a caller can only
        // ever unlock their own vault — no separate owner check needed.
        seeds = [b"vault", user.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: constrained to the fixed, compile-time TREASURY address below.
    #[account(mut, address = TREASURY @ LockVaultError::InvalidTreasury)]
    pub treasury: UncheckedAccount<'info>,
}

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub locked_lamports: u64,
    pub locked_at: i64,
    pub bump: u8,
}

impl Vault {
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 1;
}

#[error_code]
pub enum LockVaultError {
    #[msg("Lock amount must be at least 0.01 SOL")]
    AmountBelowMinimum,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Treasury account does not match the fixed program treasury")]
    InvalidTreasury,
}
