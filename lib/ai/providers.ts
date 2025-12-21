import { gateway } from "@ai-sdk/gateway";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { isTestEnvironment } from "../constants";

const isVerboseLogging = process.env.AI_VERBOSE === "true";

function withLogging<T extends LanguageModelV2>(model: T): T {
  if (!isVerboseLogging) return model;

  return wrapLanguageModel({
    model,
    middleware: {
      wrapGenerate: async ({ doGenerate, params }) => {
        console.log("\n=== AI Request ===");
        console.log("Model:", model.modelId);
        console.log("Messages:", JSON.stringify(params.prompt, null, 2));
        if (params.tools) {
          console.log("Tools:", JSON.stringify(params.tools, null, 2));
        }

        const result = await doGenerate();

        console.log("\n=== AI Response ===");
        console.log("Content:", JSON.stringify(result.content, null, 2));
        console.log("Finish Reason:", result.finishReason);
        console.log("Usage:", result.usage);
        console.log("==================\n");

        return result;
      },
      wrapStream: async ({ doStream, params }) => {
        console.log("\n=== AI Stream Request ===");
        console.log("Model:", model.modelId);
        console.log("Messages:", JSON.stringify(params.prompt, null, 2));
        if (params.tools) {
          console.log("Tools:", JSON.stringify(params.tools, null, 2));
        }

        return doStream();
      },
    },
  }) as T;
}

const THINKING_SUFFIX_REGEX = /-thinking$/;

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const isReasoningModel =
    modelId.includes("reasoning") || modelId.endsWith("-thinking");

  if (isReasoningModel) {
    const gatewayModelId = modelId.replace(THINKING_SUFFIX_REGEX, "");

    return withLogging(
      wrapLanguageModel({
        model: gateway.languageModel(gatewayModelId),
        middleware: extractReasoningMiddleware({ tagName: "thinking" }),
      })
    );
  }

  return withLogging(gateway.languageModel(modelId));
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return withLogging(gateway.languageModel("anthropic/claude-haiku-4.5"));
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return withLogging(gateway.languageModel("anthropic/claude-haiku-4.5"));
}
