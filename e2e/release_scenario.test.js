const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the 14-block scenario directly in the test file
const SCENARIO_BLOCKS = [
`agent: SkillEcosystemOrchestrator;
intent: orchestrate_superpowers_skill_ecosystem;
context:
  ecosystem_name;superpowers_skills;
  total_skills;14;
constraints:
  - coordinate_all_14_skills;required;
priority: critical;
output: ecosystem_orchestration.json;
log: skill_ecosystem_orchestration_initiated;timestamp;2025-12-31T00:00:00Z;
meta: hypothesis;Orchestrated skill ecosystem enables systematic high-quality development;
meta: confidence;0.98;
handoff: SkillDiscoveryCoordinator;`,

`agent: SkillDiscoveryCoordinator;
intent: coordinate_skill_discovery_and_selection;
context:
  received_orchestration;ecosystem_orchestration.json;
constraints:
  - start_with_using_superpowers_skill;required;
priority: critical;
output: discovery_coordinated.json;
log: skill_discovery_coordinated;timestamp;2025-12-31T00:01:00Z;
meta: hypothesis;Systematic discovery ensures appropriate skill usage;
meta: confidence;0.97;
handoff: MetaSkillRouter;`,

`agent: MetaSkillRouter;
intent: route_to_meta_skills_for_skill_ecosystem_management;
context:
  received_discovery;discovery_coordinated.json;
constraints:
  - route_skill_usage_to_using_superpowers;required;
priority: high;
output: meta_routing.json;
log: meta_skills_routed;timestamp;2025-12-31T00:02:00Z;
meta: hypothesis;Meta skills enable skill ecosystem self-management;
meta: confidence;0.95;
handoff: ProcessSkillRouter;`,

`agent: ProcessSkillRouter;
intent: route_to_process_skills_that_determine_approach;
context:
  received_routing;meta_routing.json;
constraints:
  - prioritize_process_skills;required;
priority: critical;
output: process_routing.json;
log: process_skills_routed;timestamp;2025-12-31T00:03:00Z;
meta: hypothesis;Process skills determine HOW to approach tasks;
meta: confidence;0.96;
handoff: ImplementationSkillRouter;`,

`agent: ImplementationSkillRouter;
intent: route_to_implementation_skills_after_process_determined;
context:
  received_process_routing;process_routing.json;
constraints:
  - route_after_process_determined;required;
priority: high;
output: implementation_routing.json;
log: implementation_skills_routed;timestamp;2025-12-31T00:04:00Z;
meta: hypothesis;Implementation skills execute approaches determined by process;
meta: confidence;0.94;
handoff: QualitySkillRouter;`,

`agent: QualitySkillRouter;
intent: route_to_quality_skills_throughout_workflow;
context:
  received_implementation_routing;implementation_routing.json;
constraints:
  - integrate_quality_throughout;required;
priority: critical;
output: quality_routing.json;
log: quality_skills_routed;timestamp;2025-12-31T00:05:00Z;
meta: hypothesis;Quality skills provide gates and reviews throughout development;
meta: confidence;0.97;
handoff: SkillCompositionCoordinator;`,

`agent: SkillCompositionCoordinator;
intent: coordinate_skill_composition_and_integration;
context:
  received_quality_routing;quality_routing.json;
constraints:
  - coordinate_required_sub_skill_usage;required;
priority: critical;
output: composition_coordinated.json;
log: skill_composition_coordinated;timestamp;2025-12-31T00:06:00Z;
meta: hypothesis;Skill composition creates complete workflows;
meta: confidence;0.95;
handoff: WorkflowIntegrator;`,

`agent: WorkflowIntegrator;
intent: integrate_complete_development_workflows;
context:
  received_composition;composition_coordinated.json;
constraints:
  - integrate_creative_development_workflow;required;
priority: critical;
output: workflows_integrated.json;
log: complete_workflows_integrated;timestamp;2025-12-31T00:07:00Z;
meta: hypothesis;Integrated workflows provide end-to-end development support;
meta: confidence;0.96;
handoff: SkillDependencyManager;`,

`agent: SkillDependencyManager;
intent: manage_skill_dependencies_and_prerequisites;
context:
  received_workflows;workflows_integrated.json;
constraints:
  - track_all_skill_dependencies;required;
priority: high;
output: dependencies_managed.json;
log: skill_dependencies_managed;timestamp;2025-12-31T00:08:00Z;
meta: hypothesis;Dependency management ensures correct skill composition;
meta: confidence;0.93;
handoff: SkillPriorityEnforcer;`,

`agent: SkillPriorityEnforcer;
intent: enforce_skill_priority_ordering;
context:
  received_dependencies;dependencies_managed.json;
constraints:
  - enforce_priority_ordering;required;
priority: critical;
output: priorities_enforced.json;
log: skill_priorities_enforced;timestamp;2025-12-31T00:09:00Z;
meta: hypothesis;Priority ordering ensures optimal skill sequencing;
meta: confidence;0.97;
handoff: SkillCatalogManager;`,

`agent: SkillCatalogManager;
intent: maintain_catalog_of_all_14_skills;
context:
  received_priorities;priorities_enforced.json;
constraints:
  - maintain_complete_catalog;required;
priority: high;
output: skill_catalog.json;
log: skill_catalog_maintained;timestamp;2025-12-31T00:10:00Z;
meta: hypothesis;Complete catalog enables systematic skill selection;
meta: confidence;0.96;
handoff: EcosystemHealthMonitor;`,

`agent: EcosystemHealthMonitor;
intent: monitor_skill_ecosystem_health_and_effectiveness;
context:
  received_catalog;skill_catalog.json;
constraints:
  - monitor_ecosystem_health;required;
priority: medium;
output: ecosystem_health.json;
log: ecosystem_health_monitored;timestamp;2025-12-31T00:11:00Z;
meta: hypothesis;Health monitoring enables ecosystem improvement;
meta: confidence;0.91;
handoff: SkillEvolutionCoordinator;`,

`agent: SkillEvolutionCoordinator;
intent: coordinate_skill_ecosystem_evolution;
context:
  received_health;ecosystem_health.json;
constraints:
  - coordinate_ecosystem_evolution;required;
priority: medium;
output: evolution_coordinated.json;
log: ecosystem_evolution_coordinated;timestamp;2025-12-31T00:12:00Z;
meta: hypothesis;Systematic evolution enables ecosystem adaptation;
meta: confidence;0.94;
handoff: SuperpowersOrchestrationCompleter;`,

`agent: SuperpowersOrchestrationCompleter;
intent: complete_superpowers_skill_ecosystem_orchestration;
context:
  received_evolution;evolution_coordinated.json;
constraints:
  - confirm_ecosystem_orchestration_complete;required;
priority: critical;
output: superpowers_orchestration_complete.json;
log: superpowers_orchestration_completed;timestamp;2025-12-31T00:13:00Z;
meta: hypothesis;Orchestrated ecosystem enables systematic high-quality development;
meta: confidence;0.98;
handoff: End;`
];

// Configuration
const CLI_PATH = path.resolve(__dirname, '../dist/index.js');
const TEMP_DIR = path.resolve(__dirname, 'temp');

// Force Localhost Configuration for Safety
const ENV = {
  ...process.env,
  CONTRACT_ADDRESS: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  RPC_URL: 'http://127.0.0.1:8545',
  PRIVATE_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  USE_REAL_IPFS: 'false' // Use Mock IPFS for speed
};

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function run() {
  console.log('🧪 Starting Release Scenario Test (Embedded)...');
  console.log(`🧩 Found ${SCENARIO_BLOCKS.length} embedded blocks.`);

  let previousHash = "0";

  for (let i = 0; i < SCENARIO_BLOCKS.length; i++) {
    const blockContent = SCENARIO_BLOCKS[i];
    const blockId = `release_test_${Date.now()}_${i}`;
    const filename = path.join(TEMP_DIR, `block_${i}.yamo`);

    // Write block to temp file
    fs.writeFileSync(filename, blockContent);

    // Extract Agent Name for logging
    const agentMatch = blockContent.match(/agent:\s*([^;]+);/);
    const agentName = agentMatch ? agentMatch[1].trim() : 'UnknownAgent';

    console.log(`
🚀 Submitting Block ${i + 1}/${SCENARIO_BLOCKS.length}: ${agentName}`);
    console.log(`   ID: ${blockId}`);
    console.log(`   Prev: ${previousHash}`);

    try {
      // Execute CLI command
      // node dist/index.js submit <file> --id <id> --prev <prev> --ipfs
      const cmd = `node "${CLI_PATH}" submit "${filename}" --id "${blockId}" --prev "${previousHash}" --ipfs`;
      
      const output = execSync(cmd, { env: ENV, encoding: 'utf8' });
      
      // Parse output for Hash
      const hashMatch = output.match(/Calculated Hash:\s*(0x[a-fA-F0-9]+)/);
      if (hashMatch) {
        const newHash = hashMatch[1];
        console.log(`   ✅ Success! Hash: ${newHash}`);
        previousHash = newHash; // Chain it
      } else {
        console.warn(`   ⚠️  Submitted, but could not parse hash from output.`);
        console.log("Output:", output);
      }
      
      // Verify IPFS CID presence in output
      if (!output.includes("IPFS Bundle CID")) {
        console.error("   ❌ IPFS Upload Failed!");
        process.exit(1);
      }

    } catch (error) {
      console.error(`   ❌ Failed to submit block ${i}: ${blockId}`);
      console.error(error.stdout || error.message);
      process.exit(1);
    }
  }

  console.log('\n🎉 Release Scenario Test Complete! All blocks submitted successfully.');
  
  // Cleanup
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

run();
