# lock_vault (Anchor program)

ユーザーが自分の意思で自分のSOLをロックし、解除時にロック額のみに応じた固定・不変の手数料だけを運営が受け取るプログラム。料率はロック額の階層(0.01〜0.09 SOL=1.0%、0.10〜1.09 SOL=0.5%、1.10 SOL以上=0.2%)で機械的に決まり、成績や他の参加者の状況とは無関係。他の参加者の資金が成績によって移転することは一切ない設計。詳細な法的整理は `../.claude/plans/virtual-purring-wadler.md`(このリポジトリ外のプラン)を参照。

## セットアップ(WSL2 / Ubuntu 上で実行)

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Node (via nvm) + Yarn
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install --lts
npm install -g yarn

# Anchor (via AVM)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

確認:

```bash
rustc --version
solana --version
anchor --version
```

## treasuryアドレスについて

`src/lib.rs` の `TREASURY` 定数は運営者の既存ウォレットアドレス(`49cQRProXVqA5eCXyZw1VCR73xcbq4s8kVnhWSvnNMPL`)に設定済みです。解除手数料は毎回このアドレスへ自動送金されます。秘密鍵は不要(受け取るだけなので)。このアドレスを変更する場合は `src/lib.rs` を書き換えて再ビルド・再デプロイしてください(実行中に変更する手段はありません)。

## ビルド・テスト

```bash
solana config set --url devnet
solana-keygen new -o ~/.config/solana/id.json   # provider wallet (未作成の場合)
solana airdrop 2                                 # devnet SOL

cd program
yarn install
anchor build
anchor keys sync   # declare_id! と Anchor.toml のprogram idを実際のビルド鍵に同期
anchor build        # program id を反映して再ビルド
anchor test          # ローカルバリデータでlock/unlockのテストを実行
```

## Devnetデプロイ

```bash
anchor deploy --provider.cluster devnet
```

デプロイ後、`web/.env` の `NEXT_PUBLIC_LOCK_VAULT_PROGRAM_ID` に出力されたprogram idを設定してください。

## Mainnet運用前の注意

- `anchor build` 後、`solana program show <PROGRAM_ID>` でupgrade authorityを確認し、実資金を扱う前に `solana program set-upgrade-authority <PROGRAM_ID> --final` でimmutable化することを検討する(admin keyが残っていると「非カストディ」という前提が弱くなるため)。
- `TREASURY` と手数料の階層(`TIER_*_FEE_BPS` / `TIER_*_MAX_LAMPORTS`)は再ビルドしない限り変更できない。運用中に料率を変えたくなっても、それは「裁量が入らない」という設計上の利点でもあるため、変更する場合は新しいプログラムとしてデプロイし直すこと。
