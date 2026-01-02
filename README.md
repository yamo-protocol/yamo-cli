# 💻 YAMO CLI (v1.0.0 - Protocol v0.4)

The Command Line Interface for the YAMO Protocol. Now powered by `@yamo/core`.

## 📦 Installation

```bash
# Global installation (recommended)
npm install -g @yamo/cli

# Or use npx (no installation needed)
npx @yamo/cli <command>
```

## ⚙️ Configuration

Set environment variables or create a `.env` file:

```bash
CONTRACT_ADDRESS=0x3c9440fa8d604E732233ea17095e14be1a53b015
RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# IPFS Settings (optional)
USE_REAL_IPFS=false
PINATA_JWT=your_pinata_jwt_if_using_real_ipfs
```

### Networks

**Sepolia Testnet (default):**
- Contract: `0x3c9440fa8d604E732233ea17095e14be1a53b015`
- RPC: `https://rpc.sepolia.org` (free public RPC)

**Local Development:**
- Contract: Deploy using `@yamo/contracts`
- RPC: `http://127.0.0.1:8545`

## 📖 Commands

### `yamo init <agent_name>`
Creates a new `block.yamo` template.

```bash
# With global install
yamo init MyAgent

# With npx
npx @yamo/cli init MyAgent
```

### `yamo hash <file>`
Calculates the content hash formatted for blockchain submission.

```bash
yamo hash block.yamo
```

### `yamo submit <file>`
Submits a block to the chain.
*   `--ipfs`: Uploads content to IPFS. If the YAMO file contains `output: file.json;`, it will automatically create a **Deep Bundle** containing both the trace and the artifact.
*   `-e, --encrypt`: Encrypts the IPFS bundle using AES-256-GCM.
*   `-k, --key <string>`: The passphrase for encryption (or use `YAMO_ENCRYPTION_KEY` env var).

```bash
# Basic submission
yamo submit block.yamo

# With IPFS
yamo submit block.yamo --ipfs

# With encryption
yamo submit block.yamo --ipfs --encrypt --key "my-secret"
```

### `yamo audit <blockId>`
Performs a cryptographic integrity check.
1.  Fetches block data from the chain.
2.  Downloads content from IPFS.
3.  Re-hashes the content locally.
4.  Asserts `LocalHash === ChainHash`.

*   `-k, --key <string>`: Passphrase to decrypt the content if the bundle is encrypted.

```bash
# Audit without encryption
yamo audit block_001

# Audit encrypted content
yamo audit block_001 --key "my-secret"
```

## 🔒 Encryption

YAMO v1.0 supports optional client-side encryption for IPFS bundles.
- **Algorithm**: AES-256-GCM (Authenticated Encryption).
- **Key Derivation**: Keys are derived from your passphrase using `scrypt` with a random salt.
- **Metadata**: Encrypted bundles include an `encryption_metadata.json` file with the salt and IVs. The actual content is opaque.

**Example Encrypted Workflow:**
```bash
# Submit with encryption
yamo submit task.yamo --ipfs --encrypt --key "my-secret"

# Audit encrypted block
yamo audit block_001 --key "my-secret"
```