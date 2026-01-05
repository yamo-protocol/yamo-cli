#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";
import { IpfsManager, YamoChainClient } from "@yamo/core";

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

dotenv.config();

const program = new Command();
const ipfsManager = new IpfsManager();
const chainClient = new YamoChainClient();

program
  .name("yamo")
  .description("YAMO Protocol CLI - Manage Agentic Reasoning Chains")
  .version(pkg.version);

program
  .command("hash")
  .description("Calculate the content hash of a YAMO block")
  .argument("<file>", "Path to the YAMO file")
  .action((file: string) => {
    try {
      const content = fs.readFileSync(file, "utf8").trim();
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      console.log(chalk.green("Block Content Hash:"));
      console.log(chalk.cyan(`0x${hash}`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

program
  .command("init")
  .description("Initialize a new YAMO block template")
  .argument("<agent_name>", "Name of the agent")
  .option("-i, --intent <intent>", "Agent intent", "execute_task")
  .action((agent_name: string, options: any) => {
    const template = `
agent: ${agent_name};
intent: ${options.intent};
context:
  platform;yamo_v0.5;
constraints:
  - human_readable;true;
priority: medium;
output: result.json;
meta: hypothesis;Initial hypothesis;
meta: confidence;0.9;
log: session_start;timestamp;${new Date().toISOString()};
handoff: User;
    `.trim();

    const filename = "block.yamo";
    fs.writeFileSync(filename, template);
    console.log(chalk.green(`Created YAMO template: ${chalk.bold(filename)}`));
  });

program
  .command("submit")
  .description("Submit a YAMO block to the blockchain")
  .argument("<file>", "Path to the YAMO file")
  .requiredOption("--id <blockId>", "Unique Block ID")
  .option("--prev <previousBlock>", "Previous Block Hash (omits to auto-fetch from chain)")
  .option("--consensus <type>", "Consensus Type", "cli_manual")
  .option("--ledger <name>", "Ledger Name", "yamo_cli")
  .option("--ipfs", "Upload content to IPFS before submitting")
  .option("-e, --encrypt", "Encrypt the bundle")
  .option("-k, --key <key>", "Encryption key (or set YAMO_ENCRYPTION_KEY)")
  .action(async (file: string, options: any) => {
    try {
      // Validate password if encryption is enabled
      if (options.encrypt) {
        const key = options.key || process.env.YAMO_ENCRYPTION_KEY;
        if (!key) {
          throw new Error("Encryption enabled but no key provided. Use --key or set YAMO_ENCRYPTION_KEY");
        }
        try {
          const { validatePasswordStrength } = await import("@yamo/core");
          validatePasswordStrength(key);
        } catch (e: any) {
          console.error(chalk.red("Password validation failed:"));
          console.error(chalk.red(e.message));
          console.error(chalk.yellow("\nKey requirements:"));
          console.error("  • Minimum 12 characters");
          console.error("  • Mix of uppercase, lowercase, numbers, symbols");
          console.error("  • Avoid common patterns (password, 123456, qwerty)");
          throw e;
        }
      }

      const content = fs.readFileSync(file, "utf8").trim();
      const contentHash = "0x" + crypto.createHash("sha256").update(content).digest("hex");
      console.log(chalk.blue(`Calculated Hash: ${contentHash}`));

      let ipfsCID = undefined;
      
      if (options.ipfs) {
        const outputMatch = content.match(/output:\s*([^;]+);/);
        const files = [{ name: "block.yamo", content }];

        if (outputMatch) {
          const artifactName = outputMatch[1].trim();

          // Security: Check for path traversal patterns in artifact name (Part 3: Security Fixes)
          if (artifactName.includes('..') || artifactName.startsWith('/')) {
            throw new Error(`Invalid artifact name: ${artifactName} (path-like names are not allowed)`);
          }

          const artifactPath = path.join(path.dirname(file), artifactName);

          // Security: Resolve to absolute path and restrict to input file directory
          const resolvedPath = path.resolve(artifactPath);
          const inputDir = path.resolve(path.dirname(file));
          if (!resolvedPath.startsWith(inputDir)) {
            throw new Error(`Artifact path outside allowed directory: ${artifactName}`);
          }

          if (fs.existsSync(resolvedPath)) {
            console.log(chalk.cyan(`Bundling output: ${artifactName}`));
            files.push({ name: artifactName, content: fs.readFileSync(resolvedPath, "utf8") });
          }
        }
        
        let encryptionKey = undefined;
        if (options.encrypt) {
            encryptionKey = options.key || process.env.YAMO_ENCRYPTION_KEY;
            if (!encryptionKey) {
                throw new Error("Encryption enabled but no key provided. Use --key or YAMO_ENCRYPTION_KEY.");
            }
            console.log(chalk.yellow("🔒 Encrypting bundle..."));
        }

        ipfsCID = await ipfsManager.upload({ content, files, encryptionKey });
        console.log(chalk.cyan(`IPFS Bundle CID: ${ipfsCID}`));
      }

      // Auto-fetch previousBlock if not provided (chain continuation)
      let resolvedPreviousBlock = options.prev;
      if (!resolvedPreviousBlock) {
        console.log(chalk.blue(`[INFO] No previousBlock provided, fetching latest block from chain...`));
        const latestBlock = await chainClient.getLatestBlock();
        if (latestBlock) {
          resolvedPreviousBlock = latestBlock.contentHash;
          console.log(chalk.green(`[INFO] Using latest block's contentHash: ${resolvedPreviousBlock}`));
        } else {
          // No blocks exist yet, use genesis
          resolvedPreviousBlock = "0x0000000000000000000000000000000000000000000000000000000000000000";
          console.log(chalk.yellow(`[INFO] No existing blocks found, using genesis`));
        }
      }

      await chainClient.submitBlock(
        options.id,
        resolvedPreviousBlock,
        contentHash,
        options.consensus,
        options.ledger,
        ipfsCID
      );

    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

program
  .command("audit")
  .description("Audit a block's integrity (Chain vs IPFS)")
  .argument("<blockId>", "Block ID to audit")
  .option("-k, --key <key>", "Decryption key")
  .action(async (blockId: string, options: any) => {
    try {
      console.log(chalk.blue(`Auditing Block ${blockId}...`));
      
      const block = await chainClient.getBlock(blockId);
      if (!block) {
        console.error(chalk.red("Block not found on-chain."));
        return;
      }

      console.log(chalk.gray(`Found on-chain record:`));
      console.log(`  Agent: ${block.agentAddress}`);
      console.log(`  Hash:  ${block.contentHash}`);
      console.log(`  IPFS:  ${block.ipfsCID || "None"}`);

      if (!block.ipfsCID) {
        console.log(chalk.yellow("⚠️  No IPFS CID. Cannot perform deep content audit."));
        return;
      }

      console.log(chalk.blue("Fetching content from IPFS..."));
      
      const key = options.key || process.env.YAMO_ENCRYPTION_KEY;
      const content = await ipfsManager.download(block.ipfsCID, key);
      
      const calcHash = "0x" + crypto.createHash("sha256").update(content).digest("hex");
      
      console.log(`  Calculated: ${calcHash}`);
      
      if (calcHash === block.contentHash) {
        console.log(chalk.green("✅ INTEGRITY VERIFIED: Content matches chain hash."));
      } else {
        console.log(chalk.red("❌ INTEGRITY FAILED: Hash mismatch!"));
        console.log(`  Expected: ${block.contentHash}`);
        console.log(`  Got:      ${calcHash}`);
      }

    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

program
  .command("download-bundle")
  .description("Download complete IPFS bundle including all artifacts")
  .argument("<cid>", "IPFS CID to download")
  .option("-k, --key <key>", "Decryption key (if encrypted)")
  .option("-o, --output <dir>", "Output directory (default: ./bundle_<cid>)", "./bundle_<cid>")
  .action(async (cid: string, options: any) => {
    try {
      console.log(chalk.blue(`Downloading bundle ${cid}...`));

      const { IpfsManager } = await import("@yamo/core");
      const ipfs = new IpfsManager();
      const key = options.key || process.env.YAMO_ENCRYPTION_KEY;

      const bundle = await ipfs.downloadBundle(cid, key);

      // Create output directory
      const outputDir = options.output.replace("<cid>", cid.substring(0, 8));
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write block.yamo
      fs.writeFileSync(path.join(outputDir, "block.yamo"), bundle.block);
      console.log(chalk.green(`✓ Downloaded block.yamo`));

      // Write metadata
      if (bundle.metadata) {
        fs.writeFileSync(
          path.join(outputDir, "metadata.json"),
          JSON.stringify(bundle.metadata, null, 2)
        );
        console.log(chalk.green(`✓ Downloaded metadata.json`));
      }

      // Write artifact files
      for (const [filename, content] of Object.entries(bundle.files)) {
        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, content as string);
        console.log(chalk.green(`✓ Downloaded ${filename}`));
      }

      console.log(chalk.green(`\nBundle saved to: ${outputDir}`));
      console.log(chalk.gray(`Files: ${1 + Object.keys(bundle.files).length} total`));

      if (bundle.metadata?.hasEncryption) {
        console.log(chalk.yellow("🔒 Bundle was decrypted using provided key"));
      }

    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      console.error(chalk.gray("\nIf the bundle is encrypted, provide --key or set YAMO_ENCRYPTION_KEY"));
    }
  });

program.parse();