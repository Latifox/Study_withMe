
import { AIConfig } from "./types.ts";

export function validateConfig(config: any): AIConfig {
  const defaultConfig: AIConfig = {
    temperature: 0.7,
    creativity_level: 0.5,
    detail_level: 0.6,
    custom_instructions: '',
    content_language: ''
  };

  if (!config) {
    console.log('No config provided, using defaults');
    return defaultConfig;
  }

  const validatedConfig: AIConfig = {
    temperature: Number(config.temperature) || defaultConfig.temperature,
    creativity_level: Number(config.creativity_level) || defaultConfig.creativity_level,
    detail_level: Number(config.detail_level) || defaultConfig.detail_level,
    custom_instructions: String(config.custom_instructions || defaultConfig.custom_instructions),
    content_language: String(config.content_language || defaultConfig.content_language)
  };

  // Ensure values are within valid ranges
  validatedConfig.temperature = Math.min(Math.max(validatedConfig.temperature, 0), 1);
  validatedConfig.creativity_level = Math.min(Math.max(validatedConfig.creativity_level, 0), 1);
  validatedConfig.detail_level = Math.min(Math.max(validatedConfig.detail_level, 0), 1);

  console.log('Validated config:', validatedConfig);
  return validatedConfig;
}
