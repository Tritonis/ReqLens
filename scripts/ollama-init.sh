#!/usr/bin/env bash
set -euo pipefail

MODEL="${LLM_MODEL:-qwen2.5:7b}"
echo "Pulling Ollama model: $MODEL"
ollama pull "$MODEL"
echo "Done. $MODEL is ready at http://localhost:11434"
