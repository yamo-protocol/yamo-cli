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

# Link globally (optional)
npm link

# Verify installation
yamo --help
```

### From NPM (Coming Soon)

Once published to npm, you'll be able to install with:

```bash
npm install -g @yamo/cli
```

_Note: The package is not yet published to npm. Please use the GitHub installation method above._

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
