// src/orchestrator.ts
class Orchestrator {
  config;
  defaultModel;
  constructor(config, defaultModel) {
    this.config = config;
    this.defaultModel = defaultModel;
  }
  decompose(prompt) {
    const subtasks = [];
    const needsCoder = /code|implement|write|create|build|fix|refactor|debug/i.test(prompt);
    const needsResearcher = /research|find|search|investigate|analyze|compare/i.test(prompt);
    const needsReviewer = /review|check|audit|validate|test|verify/i.test(prompt);
    const needsDesigner = /design|ui|ux|layout|style|visual|interface/i.test(prompt);
    if (needsCoder) {
      subtasks.push({ role: "coder", prompt });
    }
    if (needsResearcher) {
      subtasks.push({ role: "researcher", prompt });
    }
    if (needsReviewer) {
      subtasks.push({ role: "reviewer", prompt, dependencies: [0] });
    }
    if (needsDesigner) {
      subtasks.push({ role: "designer", prompt });
    }
    if (subtasks.length === 0) {
      subtasks.push({ role: "all", prompt });
    }
    return { originalPrompt: prompt, subtasks };
  }
  synthesize(input) {
    const { prompt, responses } = input;
    if (responses.length === 0) {
      return "No responses received from agents.";
    }
    if (responses.length === 1) {
      return responses[0].content;
    }
    const parts = [];
    parts.push(`Based on analysis from ${responses.length} agents:
`);
    for (const response of responses) {
      const roleName = response.role.charAt(0).toUpperCase() + response.role.slice(1);
      const modelName = response.model.split("/").pop() || response.model;
      parts.push(`### ${roleName} (${modelName})
`);
      parts.push(response.content);
      parts.push("");
    }
    return parts.join(`
`);
  }
  getAgentForRole(role) {
    if (role === "all") {
      return this.config.find((c) => c.role === "all") || this.config[0];
    }
    return this.config.find((c) => c.role === role);
  }
  getAvailableRoles() {
    return this.config.map((c) => c.role);
  }
}
// src/runner.ts
class MultiModelRunner {
  orchestrator;
  providers;
  constructor(options) {
    this.orchestrator = options.orchestrator;
    this.providers = options.providers;
  }
  async run(prompt) {
    const decomposition = this.orchestrator.decompose(prompt);
    const responses = [];
    for (const subtask of decomposition.subtasks) {
      const agentConfig = this.orchestrator.getAgentForRole(subtask.role);
      if (!agentConfig)
        continue;
      const provider = this.providers.get(agentConfig.provider);
      if (!provider)
        continue;
      const systemPrompt = agentConfig.systemPrompt || this.getDefaultSystemPrompt(subtask.role);
      const fullPrompt = `${systemPrompt}

User request: ${subtask.prompt}`;
      try {
        const content = await provider.complete(fullPrompt, {
          model: agentConfig.model,
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens
        });
        responses.push({
          role: subtask.role,
          model: agentConfig.model,
          provider: agentConfig.provider,
          content,
          timestamp: Date.now()
        });
      } catch (error) {
        responses.push({
          role: subtask.role,
          model: agentConfig.model,
          provider: agentConfig.provider,
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: Date.now()
        });
      }
    }
    const synthesis = this.orchestrator.synthesize({
      prompt,
      responses,
      orchestratorModel: this.orchestrator.getAgentForRole("orchestrator")?.model || "unknown"
    });
    responses.push({
      role: "orchestrator",
      model: this.orchestrator.getAgentForRole("orchestrator")?.model || "unknown",
      provider: this.orchestrator.getAgentForRole("orchestrator")?.provider || "unknown",
      content: synthesis,
      timestamp: Date.now()
    });
    return responses;
  }
  getDefaultSystemPrompt(role) {
    const prompts = {
      coder: "You are a senior software engineer. Write clean, maintainable code. Follow best practices and patterns.",
      researcher: "You are a research analyst. Gather information, analyze data, and provide well-sourced insights.",
      reviewer: "You are a code reviewer. Check for bugs, security issues, and suggest improvements.",
      designer: "You are a UI/UX designer. Focus on user experience, accessibility, and visual design.",
      analyst: "You are a data analyst. Analyze patterns, metrics, and provide actionable insights.",
      orchestrator: "You are the orchestrator. Coordinate the team and synthesize the final answer.",
      all: "You are a helpful assistant. Provide comprehensive, accurate responses."
    };
    return prompts[role] || prompts.all;
  }
}
// src/conversational.ts
class ConversationalAgent {
  models;
  orchestratorModel;
  orchestratorProvider;
  providers;
  constructor(options) {
    this.models = options.models;
    this.orchestratorModel = options.orchestratorModel;
    this.orchestratorProvider = options.orchestratorProvider;
    this.providers = options.providers;
  }
  async run(prompt) {
    const responses = [];
    const modelPromises = this.models.map(async (model) => {
      const provider = this.providers.get(model.provider);
      if (!provider)
        return null;
      const systemPrompt = model.systemPrompt || this.getDefaultSystemPrompt(model.id);
      const fullPrompt = `${systemPrompt}

The user asked: ${prompt}

Please give your independent analysis. Do not repeat what others have said — your response will be merged.`;
      try {
        const content = await provider.complete(fullPrompt, { model: model.id });
        return {
          role: "analyst",
          model: model.id,
          provider: model.provider,
          content,
          timestamp: Date.now()
        };
      } catch (error) {
        return {
          role: "analyst",
          model: model.id,
          provider: model.provider,
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: Date.now()
        };
      }
    });
    const modelResponses = await Promise.all(modelPromises);
    for (const response of modelResponses) {
      if (response)
        responses.push(response);
    }
    const orchestratorProvider = this.providers.get(this.orchestratorProvider);
    if (orchestratorProvider) {
      const synthesisPrompt = this.buildSynthesisPrompt(prompt, responses);
      try {
        const synthesis = await orchestratorProvider.complete(synthesisPrompt, { model: this.orchestratorModel });
        responses.push({
          role: "orchestrator",
          model: this.orchestratorModel,
          provider: this.orchestratorProvider,
          content: synthesis,
          timestamp: Date.now()
        });
      } catch (error) {
        responses.push({
          role: "orchestrator",
          model: this.orchestratorModel,
          provider: this.orchestratorProvider,
          content: `Synthesis error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: Date.now()
        });
      }
    }
    return responses;
  }
  buildSynthesisPrompt(originalPrompt, responses) {
    const parts = [
      "You are the orchestrator in a multi-model discussion.",
      `The user asked: "${originalPrompt}"`,
      "",
      "Here are the independent responses from each model:",
      ""
    ];
    for (const response of responses) {
      const modelName = response.model.split("/").pop() || response.model;
      parts.push(`### ${modelName} (${response.provider})`);
      parts.push(response.content);
      parts.push("");
    }
    parts.push("Based on all responses, synthesize a single authoritative answer.");
    parts.push("Credit each model by name for their contributions.");
    parts.push("Produce a comprehensive, well-structured final answer.");
    return parts.join(`
`);
  }
  getDefaultSystemPrompt(modelId) {
    return `You are a helpful AI assistant. Provide thoughtful, well-reasoned analysis. Be concise but thorough.`;
  }
}
export {
  Orchestrator,
  MultiModelRunner,
  ConversationalAgent
};
