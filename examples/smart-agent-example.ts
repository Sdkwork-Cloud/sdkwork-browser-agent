/**
 * Example: Smart Agent Usage
 *
 * This example demonstrates how to use the SmartAgent with automatic
 * skill selection, dynamic loading, and token optimization.
 */

import { SmartAgent, OpenAIProvider, Skill, Tool, builtInSkills, builtInTools } from '../src';

async function main() {
  // Create a SmartAgent with OpenAI provider
  const agent = new SmartAgent({
    name: 'my-smart-agent',
    description: 'An intelligent agent with auto skill selection',
    version: '1.0.0',
    llmProvider: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
    }),
    systemPrompt: 'You are a helpful assistant with access to various skills.',
    skills: builtInSkills,
    tools: builtInTools,
    autoDecide: true,
    decisionEngine: {
      enableEmbeddings: true,
      enableCaching: true,
      threshold: 0.6,
    },
    tokenOptimizer: {
      enableCompression: true,
      maxSkillDescriptionLength: 200,
    },
  });

  // Initialize the agent
  await agent.initialize();

  console.log('Agent initialized!');
  console.log('Available skills:', agent.getSkillNames());
  console.log('Available tools:', agent.getToolNames());

  // Example 1: Simple skill execution
  console.log('\n--- Example 1: Direct skill execution ---');
  const echoResult = await agent.executeSkill('echo', { message: 'Hello, World!' });
  console.log('Echo result:', echoResult);

  // Example 2: Auto-process with decision making
  console.log('\n--- Example 2: Auto-process with decision ---');
  const result1 = await agent.process('Calculate 2 + 2');
  console.log('Decision:', result1.decision);
  console.log('Result:', result1.result);
  console.log('Execution time:', result1.executionTime, 'ms');

  // Example 3: Another auto-process
  console.log('\n--- Example 3: Another auto-process ---');
  const result2 = await agent.process('What is the weather today?');
  console.log('Decision:', result2.decision);
  console.log('Result:', result2.result);

  // Example 4: Chat with LLM
  console.log('\n--- Example 4: Chat with LLM ---');
  const chatResult = await agent.chat([{ role: 'user', content: 'What is TypeScript?' }]);
  console.log('Chat response:', chatResult.content);

  // Example 5: Register a custom skill
  console.log('\n--- Example 5: Custom skill ---');
  const customSkill: Skill = {
    name: 'greet',
    description: 'Greet a user by name',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the person to greet',
        },
      },
      required: ['name'],
    },
    handler: async params => ({
      success: true,
      data: `Hello, ${params.name}! Welcome!`,
    }),
    metadata: {
      category: 'greeting',
      tags: ['social', 'welcome'],
    },
  };

  agent.registerSkill(customSkill);

  const greetResult = await agent.process('Greet John');
  console.log('Greet result:', greetResult.result);

  // Example 6: Get execution history
  console.log('\n--- Example 6: Execution history ---');
  const history = agent.getExecutionHistory();
  console.log('Number of executions:', history.length);

  // Example 7: Get decision stats
  console.log('\n--- Example 7: Decision stats ---');
  const stats = agent.getDecisionStats();
  console.log('Stats:', stats);

  // Cleanup
  await agent.destroy();
  console.log('\nAgent destroyed.');
}

// Run the example
main().catch(console.error);
