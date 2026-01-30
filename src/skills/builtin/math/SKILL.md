---
name: math
description: Perform mathematical calculations safely. Use when users ask for calculations, math problems, or numeric operations. Supports basic arithmetic operations.
license: MIT
metadata:
  author: sdkwork-browser-agent
  version: '1.0.0'
  category: utility
  tags: math calculation arithmetic utility
compatibility: Safe evaluation - only basic math operations allowed
---

# Math Skill

Performs mathematical calculations with safe evaluation. Only basic arithmetic operations are allowed for security.

## When to Use

- User asks for calculations ("what is 2+2?")
- Mathematical expressions need evaluation
- Quick arithmetic operations
- Converting units or percentages

## Parameters

- `expression` (string, required): Mathematical expression to evaluate
  - Allowed operators: `+`, `-`, `*`, `/`, `()`, `.`
  - Allowed characters: digits 0-9, whitespace
  - **Security**: All other characters are stripped for safety

## Examples

### Basic Arithmetic

```yaml
skill: math
parameters:
  expression: '2 + 2'
```

**Output:**

```
4
```

### Complex Expression

```yaml
skill: math
parameters:
  expression: '(10 + 5) * 2 / 3'
```

**Output:**

```
10
```

### Decimal Operations

```yaml
skill: math
parameters:
  expression: '3.14159 * 2'
```

**Output:**

```
6.28318
```

## Security Notes

- **Input Sanitization**: All non-math characters are removed
- **No Code Execution**: Only basic arithmetic is supported
- **Safe Evaluation**: Uses controlled evaluation environment
- **No External Calls**: No network or file system access

## Error Handling

Returns error for:

- Invalid expressions
- Division by zero
- Malformed numeric values

## Limitations

- No advanced math functions (sin, cos, log, etc.)
- No variable support
- No scientific notation
- Maximum expression length: 1000 characters
