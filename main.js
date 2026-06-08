import { program } from 'commander';
import runPipeline from './pipeline.js';

program
  .version('1.0.0')
  .description('Vocallabs Pipeline CLI')
  .argument('<seed_domain>', 'The company domain to start the pipeline')
  .action(async (seed_domain) => {
    console.log(`🚀 Starting pipeline with seed: ${seed_domain}`);
    try {
      await runPipeline(seed_domain);
      console.log('✅ Pipeline completed successfully!');
    } catch (error) {
      console.error(`❌ Pipeline failed: ${error.message}`);
    }
  });

program.parse();