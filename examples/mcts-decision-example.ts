/**
 * Example: MCTS Decision Engine
 *
 * This example demonstrates how to use the MCTS (Monte Carlo Tree Search)
 * decision engine for complex multi-step decision making.
 */

import { MCTSDecisionEngine, MCTSFactory, DecisionState, Action } from '../src/algorithms/mcts-decision-engine';
import { Logger } from '../src/utils/logger';

const logger = new Logger({ level: 'info' }, 'MCTSExample');

// Define a complex decision scenario: Game AI
interface GameState extends DecisionState {
  board: number[][];
  currentPlayer: number;
  score: number;
}

class GameMCTSExample {
  private mcts: MCTSDecisionEngine;

  constructor() {
    // Create MCTS with balanced configuration
    this.mcts = MCTSFactory.createBalanced();
    logger.info('MCTS Decision Engine initialized');
  }

  async run() {
    logger.info('=== MCTS Decision Example ===');

    // Define initial game state
    const initialState: GameState = {
      id: 'game-initial',
      features: [0, 0, 0, 0, 0, 0, 0, 0, 0], // 3x3 board flattened
      isTerminal: false,
      depth: 0,
      board: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      currentPlayer: 1,
      score: 0,
    };

    // Define available actions
    const actions: Action[] = [
      { id: 'move-0-0', name: 'Place at (0,0)', description: 'Top-left corner' },
      { id: 'move-0-1', name: 'Place at (0,1)', description: 'Top-center' },
      { id: 'move-0-2', name: 'Place at (0,2)', description: 'Top-right corner' },
      { id: 'move-1-0', name: 'Place at (1,0)', description: 'Middle-left' },
      { id: 'move-1-1', name: 'Place at (1,1)', description: 'Center', priorProbability: 0.3 }, // Center is usually best
      { id: 'move-1-2', name: 'Place at (1,2)', description: 'Middle-right' },
      { id: 'move-2-0', name: 'Place at (2,0)', description: 'Bottom-left corner' },
      { id: 'move-2-1', name: 'Place at (2,1)', description: 'Bottom-center' },
      { id: 'move-2-2', name: 'Place at (2,2)', description: 'Bottom-right corner' },
    ];

    logger.info('Starting MCTS decision process...');
    logger.info(`Available actions: ${actions.length}`);

    // Make decision
    const startTime = Date.now();
    const result = await this.mcts.decide(initialState, actions);
    const decisionTime = Date.now() - startTime;

    // Log results
    logger.info('\n=== Decision Results ===');
    logger.info(`Selected action: ${result.selectedAction.name}`);
    logger.info(`Confidence: ${(result.confidence * 100).toFixed(2)}%`);
    logger.info(`Estimated value: ${result.estimatedValue.toFixed(4)}`);
    logger.info(`Visit count: ${result.visitCount}`);
    logger.info(`Decision time: ${decisionTime}ms`);

    logger.info('\n=== Action Statistics ===');
    result.actionStats.forEach((stat, index) => {
      logger.info(
        `${index + 1}. ${stat.action.name} - ` +
        `Visits: ${stat.visitCount}, ` +
        `Mean Reward: ${stat.meanReward.toFixed(4)}, ` +
        `UCB: ${stat.ucbScore.toFixed(4)}`
      );
    });

    logger.info('\n=== Tree Statistics ===');
    logger.info(`Total nodes: ${result.treeStats.totalNodes}`);
    logger.info(`Total visits: ${result.treeStats.totalVisits}`);
    logger.info(`Max depth: ${result.treeStats.maxDepth}`);
    logger.info(`Average depth: ${result.treeStats.averageDepth.toFixed(2)}`);
    logger.info(`Leaf nodes: ${result.treeStats.leafNodes}`);

    return result;
  }

  // Example with custom simulation policy
  async runWithCustomPolicy() {
    logger.info('\n=== MCTS with Custom Policy ===');

    // Create custom simulation policy
    const customPolicy = {
      selectAction: async (state: DecisionState, availableActions: Action[]) => {
        // Heuristic: prefer center and corners
        const preferredMoves = ['move-1-1', 'move-0-0', 'move-0-2', 'move-2-0', 'move-2-2'];
        for (const moveId of preferredMoves) {
          const action = availableActions.find(a => a.id === moveId);
          if (action) return action;
        }
        return availableActions[Math.floor(Math.random() * availableActions.length)];
      },
      evaluateTerminal: (state: DecisionState) => {
        // Simple evaluation function
        return Math.random() * 2 - 1; // Random score between -1 and 1
      },
    };

    // Create MCTS with custom policy
    const customMCTS = new MCTSDecisionEngine(customPolicy, {
      explorationConstant: 1.414,
      maxIterations: 500,
      parallelSimulations: 2,
    });

    const initialState: GameState = {
      id: 'game-custom',
      features: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      isTerminal: false,
      depth: 0,
      board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      currentPlayer: 1,
      score: 0,
    };

    const actions: Action[] = [
      { id: 'move-0-0', name: 'Place at (0,0)' },
      { id: 'move-1-1', name: 'Place at (1,1)', priorProbability: 0.3 },
      { id: 'move-2-2', name: 'Place at (2,2)' },
    ];

    const result = await customMCTS.decide(initialState, actions);
    logger.info(`Custom policy selected: ${result.selectedAction.name}`);

    return result;
  }

  // Compare different MCTS configurations
  async compareConfigurations() {
    logger.info('\n=== Configuration Comparison ===');

    const configs = [
      { name: 'Fast', mcts: MCTSFactory.createFast() },
      { name: 'Balanced', mcts: MCTSFactory.createBalanced() },
      { name: 'Thorough', mcts: MCTSFactory.createThorough() },
    ];

    const initialState: GameState = {
      id: 'game-compare',
      features: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      isTerminal: false,
      depth: 0,
      board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      currentPlayer: 1,
      score: 0,
    };

    const actions: Action[] = [
      { id: 'move-0-0', name: 'Place at (0,0)' },
      { id: 'move-1-1', name: 'Place at (1,1)' },
      { id: 'move-2-2', name: 'Place at (2,2)' },
    ];

    for (const { name, mcts } of configs) {
      const startTime = Date.now();
      const result = await mcts.decide(initialState, actions);
      const duration = Date.now() - startTime;

      logger.info(
        `${name}: Selected ${result.selectedAction.name}, ` +
        `Time: ${duration}ms, ` +
        `Nodes: ${result.treeStats.totalNodes}, ` +
        `Visits: ${result.treeStats.totalVisits}`
      );
    }
  }
}

// Run the example
async function main() {
  const example = new GameMCTSExample();

  try {
    await example.run();
    await example.runWithCustomPolicy();
    await example.compareConfigurations();

    logger.info('\n=== Example completed successfully ===');
  } catch (error) {
    logger.error('Example failed:', {}, error as Error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { GameMCTSExample };
