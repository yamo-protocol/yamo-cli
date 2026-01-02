# @yamo/cli

Command-line interface for the YAMO Protocol.

## Overview

The YAMO CLI provides developer tools for creating, hashing, submitting, and auditing YAMO blocks on EVM-compatible blockchains with IPFS integration.

## Installation

### From GitHub (Current Method)

```bash
# Clone the repository
git clone https://github.com/yamo-protocol/yamo-cli.git
cd yamo-cli

# Install dependencies
npm install

# Build
npm run build
```

**Option A: Use locally without global install**

```bash
npm start -- --help
npm start -- init MyAgent
npm start -- hash myfile.yamo
```

**Option B: Install globally**

```bash
sudo npm link
yamo --help
yamo init MyAgent
```

### From NPM (Coming Soon)

Once published to npm, you'll be able to install with:

```bash
npm install -g @yamo/cli
```

_Note: The package is not yet published to npm. Please use the GitHub installation method above._

## Configuration

**Important:** Before using `submit` or `audit` commands, create a `.env` file in the yamo-cli directory:

```bash
cd yamo-cli
cp .env.example .env
# Edit .env with your configuration
```

Or create it manually:

```bash
cat > .env << 'EOF'
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
PINATA_JWT=
EOF
```

**Environment Variables:**

- `RPC_URL` - Blockchain RPC endpoint (required for `submit` and `audit`)
- `PRIVATE_KEY` - Wallet private key for signing transactions (required for `submit`)
- `CONTRACT_ADDRESS` - Deployed YAMORegistry contract address (required for `submit` and `audit`)
- `PINATA_JWT` - Pinata API token for IPFS uploads (optional - uses mock if not set)

**Note:** The private key shown above is from Hardhat's test accounts (safe for local development only). Never use it on mainnet or testnets with real funds.

**Commands that work without .env:**
- `yamo init` - ✅ No configuration needed
- `yamo hash` - ✅ No configuration needed

**Commands that require .env:**
- `yamo submit` - ❌ Requires RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS
- `yamo audit` - ❌ Requires RPC_URL, CONTRACT_ADDRESS

## Commands

### `yamo init <agentName>`

Initialize a new YAMO block file.

```bash
yamo init MyAgent
```

Creates a new `.yamo` file with the basic structure.

### `yamo hash <file>`

Calculate the SHA256 hash of a YAMO file.

```bash
yamo hash my-block.yamo
```

Returns the content hash that will be stored on-chain for verification.

### `yamo submit <file>`

Submit a YAMO block to the blockchain with IPFS anchoring.

```bash
yamo submit my-block.yamo
```

This command uploads content to IPFS, calculates the hash, and submits to the blockchain.

### `yamo audit <blockId>`

Verify the integrity of a YAMO block.

```bash
yamo audit block_001
```

Fetches the block from the blockchain and verifies integrity.

## Configuration

Create a `.env` file or set environment variables:

```env
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=0x...
PINATA_JWT=your_pinata_jwt
```

## License

MIT
