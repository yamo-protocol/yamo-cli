#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";
import { IpfsManager, YamoChainClient } from "@yamo/core";

dotenv.config();

const program = new Command();
const ipfsManager = new IpfsManager();
const chainClient = new YamoChainClient();

program
  .name("yamo")
  .description("YAMO Protocol CLI - Manage Agentic Reasoning Chains")
  .version("0.5.0");

program
  .command("hash")
  .description("Calculate the content hash of a YAMO block")
  .argument("<file>", "Path to the YAMO file")
  .action((file) => {
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
  .action((agent_name, options) => {
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
  .option("--prev <previousBlock>", "Previous Block Hash", "0")
  .option("--consensus <type>", "Consensus Type", "cli_manual")
  .option("--ledger <name>", "Ledger Name", "yamo_cli")
  .option("--ipfs", "Upload content to IPFS before submitting")
  .action(async (file, options) => {
    try {
      const content = fs.readFileSync(file, "utf8").trim();
      const contentHash = "0x" + crypto.createHash("sha256").update(content).digest("hex");
      console.log(chalk.blue(`Calculated Hash: ${contentHash}`));

      let ipfsCID = undefined;
      
      if (options.ipfs) {
        const outputMatch = content.match(/output:\s*([^;]+);/);
        const files = [{ name: "block.yamo", content }];

        if (outputMatch) {
          const artifactName = outputMatch[1].trim();
          const artifactPath = path.join(path.dirname(file), artifactName);
          if (fs.existsSync(artifactPath)) {
            console.log(chalk.cyan(`Bundling output: ${artifactName}`));
            files.push({ name: artifactName, content: fs.readFileSync(artifactPath, "utf8") });
          }
        }

        ipfsCID = await ipfsManager.upload({ content, files });
        console.log(chalk.cyan(`IPFS Bundle CID: ${ipfsCID}`));
      }

      await chainClient.submitBlock(
        options.id,
        options.prev,
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
  .action(async (blockId) => {
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
      const content = await ipfsManager.download(block.ipfsCID);
      
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

program.parse();