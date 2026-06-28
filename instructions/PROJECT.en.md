# AI Development Support Configuration

This project uses the AI instruction system in `instructions/ai_instruction_kits/`.
Please load `instructions/ai_instruction_kits/instructions/en/system/ROOT_INSTRUCTION.md` when starting a task.

## Project Settings
- Language: English (en)
- Task management & progress tracking: use your AI tool's native features

## Important Paths
- AI Instruction System: `instructions/ai_instruction_kits/`
- Safe commit: `scripts/commit.sh`
- Project-Specific Configuration: This file (`instructions/PROJECT.en.md`)

## Commit Rules
- **Required**: `bash scripts/commit.sh "message"` or `git commit -m "message"`
- **Prohibited**: AI-signed commits (auto-detected and rejected)

## Project-Specific Instructions
<!-- Add your project-specific instructions here -->

### Examples:
- Coding Standards: 
- Test Framework: 
- Build Commands: 
- Lint Commands: 
- Other Constraints: 