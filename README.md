# 💻 YAMO CLI (v1.0.0 - Protocol v0.4)

The Command Line Interface for the YAMO Protocol. Now powered by `@yamo/core`.

## 📥 Installation

From the monorepo root:
```bash
npm install
npm run build --workspaces
```

## ⚙️ Configuration (.env)
Create a `.env` file in `packages/cli`:

```bash
CONTRACT_ADDRESS=0xe7f1...
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0x...

# IPFS Settings
USE_REAL_IPFS=true
PINATA_JWT=eyJ...
```

## 📖 Commands

### `yamo init <agent_name>`
Creates a new `block.yamo` template.

### `yamo hash <file>`
Calculates the content hash formatted for blockchain submission.

### `yamo submit <file>`
Submits a block to the chain.
*   `--ipfs`: Uploads content to IPFS. If the YAMO file contains `output: file.json;`, it will automatically create a **Deep Bundle** containing both the trace and the artifact.
*   `-e, --encrypt`: Encrypts the IPFS bundle using AES-256-GCM.
*   `-k, --key <string>`: The passphrase for encryption (or use `YAMO_ENCRYPTION_KEY` env var).

### `yamo audit <blockId>`
Performs a cryptographic integrity check.
1.  Fetches block data from the chain.
2.  Downloads content from IPFS.
3.  Re-hashes the content locally.
4.  Asserts `LocalHash === ChainHash`.

*   `-k, --key <string>`: Passphrase to decrypt the content if the bundle is encrypted.

## 🔒 Encryption

YAMO v1.0 supports optional client-side encryption for IPFS bundles.
- **Algorithm**: AES-256-GCM (Authenticated Encryption).
- **Key Derivation**: Keys are derived from your passphrase using `scrypt` with a random salt.
- **Metadata**: Encrypted bundles include an `encryption_metadata.json` file with the salt and IVs. The actual content is opaque.

**Example Encrypted Workflow:**
```bash
# Submit
yamo submit task.yamo --id 123 --ipfs --encrypt --key "my-secret"

# Audit
yamo audit 123 --key "my-secret"
```