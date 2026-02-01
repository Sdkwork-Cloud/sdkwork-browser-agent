# SDKWork Browser Agent Examples

This directory contains comprehensive examples demonstrating the capabilities of SDKWork Browser Agent.

## Quick Start Examples

### 1. Smart Agent Basic Usage
**File**: `smart-agent-example.ts`

Demonstrates the basic usage of SmartAgent with automatic skill selection, dynamic loading, and token optimization.

```bash
npx ts-node examples/smart-agent-example.ts
```

**Features demonstrated**:
- Agent initialization
- Direct skill execution
- Auto-process with decision making
- Chat with LLM
- Custom skill registration
- Execution history tracking

### 2. MCTS Decision Engine
**File**: `mcts-decision-example.ts`

Shows how to use the Monte Carlo Tree Search (MCTS) decision engine for complex multi-step decision making.

```bash
npx ts-node examples/mcts-decision-example.ts
```

**Features demonstrated**:
- MCTS basic usage
- Custom simulation policies
- Configuration comparison (Fast/Balanced/Thorough)
- Decision statistics and tree analysis

### 3. Secure Agent
**File**: `secure-agent-example.ts`

Demonstrates security features including Secure Sandbox and Prompt Injection Detection.

```bash
npx ts-node examples/secure-agent-example.ts
```

**Features demonstrated**:
- Secure Sandbox (code isolation, resource limits)
- Prompt Injection Detection (8 attack types)
- Security integration with Agent
- Sandbox pool for high-throughput

### 4. Vector Memory System
**File**: `vector-memory-example.ts`

Shows how to use the vector memory system for semantic search and retrieval.

```bash
npx ts-node examples/vector-memory-example.ts
```

**Features demonstrated**:
- Embedding Providers (TF-IDF, OpenAI, etc.)
- Vector Database operations
- Hybrid search (vector + text)
- Database Manager
- Semantic similarity calculation

## Full Application Example

### Chat Agent Application
**Directory**: `chat-agent/`

A complete React-based chat application demonstrating real-world usage.

```bash
cd examples/chat-agent
npm install
npm run dev
```

**Features demonstrated**:
- React integration
- Real-time chat interface
- Skill loading UI
- MCP (Model Context Protocol) integration
- Execution monitoring
- Export functionality
- Theme switching

## Running Examples

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (for examples requiring API keys):
```bash
export OPENAI_API_KEY="your-api-key"
export ANTHROPIC_API_KEY="your-api-key"
```

### Using ts-node

```bash
# Run specific example
npx ts-node examples/smart-agent-example.ts

# Run with custom tsconfig
npx ts-node --project tsconfig.json examples/mcts-decision-example.ts
```

### Using tsx (faster)

```bash
# Install tsx globally
npm install -g tsx

# Run example
tsx examples/secure-agent-example.ts
```

## Example Structure

Each example follows this structure:

```typescript
/**
 * Example: [Name]
 *
 * Description of what this example demonstrates.
 */

import { ... } from '../src';
import { Logger } from '../src/utils/logger';

const logger = new Logger({ level: 'info' }, 'ExampleName');

class ExampleClass {
  async initialize() {
    // Setup code
  }

  async demonstrateFeature1() {
    // Feature demonstration
  }

  async demonstrateFeature2() {
    // Feature demonstration
  }

  async cleanup() {
    // Cleanup code
  }
}

// Run the example
async function main() {
  const example = new ExampleClass();
  try {
    await example.initialize();
    await example.demonstrateFeature1();
    await example.demonstrateFeature2();
  } catch (error) {
    logger.error('Example failed:', {}, error as Error);
  } finally {
    await example.cleanup();
  }
}

if (require.main === module) {
  main();
}

export { ExampleClass };
```

## Creating Your Own Example

1. Create a new file in `examples/` directory
2. Import required modules from `../src`
3. Use the `Logger` for consistent output
4. Wrap in a class with `initialize()`, `demonstrate*()`, and `cleanup()` methods
5. Export the class and provide a `main()` function
6. Add documentation at the top of the file

## Environment Variables

| Variable | Description | Required For |
|----------|-------------|--------------|
| `OPENAI_API_KEY` | OpenAI API key | OpenAI examples |
| `ANTHROPIC_API_KEY` | Anthropic API key | Claude examples |
| `GEMINI_API_KEY` | Google Gemini API key | Gemini examples |

## Troubleshooting

### TypeScript Errors

If you encounter TypeScript errors, ensure:
1. All dependencies are installed: `npm install`
2. TypeScript config is correct: `tsconfig.json`
3. Using correct import paths: `../src` not `sdkwork-browser-agent`

### API Key Errors

Examples requiring API keys will fail gracefully with a warning. To run these examples:
1. Obtain API keys from respective providers
2. Set them as environment variables
3. Or modify the example to use hardcoded keys (not recommended for production)

### Memory Issues

Some examples (like Vector Memory) may use significant memory. If you encounter issues:
- Reduce batch sizes
- Lower cache sizes
- Use smaller dimensions (e.g., 384 instead of 1536)

## Contributing

When adding new examples:
1. Follow the existing code structure
2. Add comprehensive comments
3. Include error handling
4. Add to this README
5. Test on both Node.js and browser environments (if applicable)

## License

MIT License - see LICENSE file for details
