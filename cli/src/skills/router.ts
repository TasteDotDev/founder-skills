import { loadSkillFile, stripFrontmatter, loadFramework, getAllCategories, getCategoryFrameworks } from './loader.js';

function stripClaudeReferences(text: string): string {
  // Remove Skill tool references
  text = text.replace(/Use the Skill tool to invoke category skills[^\n]*\n/g, '');
  // Remove /skill slash command references in prose
  text = text.replace(/`\/(\w[\w-]*)`/g, '$1');
  return text;
}

export interface PromptOptions {
  category?: string;
  framework?: string;
}

export function buildSystemPrompt(options: PromptOptions = {}): string {
  const { category, framework } = options;

  if (framework) {
    return buildFrameworkPrompt(framework, category);
  }

  if (category) {
    return buildCategoryPrompt(category);
  }

  return buildFounderPrompt();
}

function buildFounderPrompt(): string {
  const skill = loadSkillFile('founder');
  let prompt = stripFrontmatter(skill);
  prompt = stripClaudeReferences(prompt);

  // Replace the category table with tool usage instructions
  prompt = prompt.replace(
    /\| Category \| Skill \| Frameworks \| Best for \|\n\|[-| ]+\|\n(?:\|[^\n]+\|\n)+/,
    ''
  );

  prompt += `

## Tool usage

You have access to tools to look up and apply business frameworks:

- **listFrameworks**: List available frameworks in a category, or list all categories.
- **applyFramework**: Load the full expert instructions for a specific framework.

When analyzing a problem:
1. Decide which frameworks are relevant based on the problem type
2. Call applyFramework for each framework you want to apply (2-4 max)
3. Apply each framework with full rigor using the expert instructions
4. Synthesize into actionable recommendations

## Voice and tone — THIS IS CRITICAL

You are in service to the user. They know their business better than you ever will. Your job is to support their thinking, not replace it.

**Before anything else**: Read how the user writes. Their tone, their vocabulary, their energy, their level of formality — that's your guide. Absorb it. Match it exactly. If they're raw and direct, be raw and direct. If they're measured and precise, be that. Never impose a voice on them.

**What you are NOT**: You are not a salesperson. You are not a consultant performing confidence. You are not trying to impress anyone. You are not pushing frameworks for the sake of seeming thorough.

**What you ARE**: Deeply attentive. Quietly competent. Introspective. You listen more than you talk. You ask before you assume. You hold space for the user's own insights — often the best answer is already in their head and your job is to help them see it clearly.

**Practically**:
- If something is unclear, ask. Don't fill gaps with assumptions dressed up as analysis.
- If the user's instinct conflicts with a framework's output, explore their instinct first — they have context you don't.
- Never perform expertise. Just be useful.
- Use their words, not yours. If they say "we're stuck," don't rephrase it as "growth inflection challenge."
`;

  return prompt;
}

function buildCategoryPrompt(categoryName: string): string {
  const skill = loadSkillFile(categoryName);
  let prompt = stripFrontmatter(skill);
  prompt = stripClaudeReferences(prompt);

  prompt += `

## Tool usage

You have access to tools to look up and apply frameworks from the ${categoryName} category:

- **listFrameworks**: List available frameworks in this category.
- **applyFramework**: Load the full expert instructions for a specific framework.

Call applyFramework for each framework you want to apply, then apply it with full rigor.

## Voice and tone

You are in service to the user. Match their communication style exactly — their words, their tone, their energy. Never impose a voice. Listen first. Ask before assuming. If their instinct conflicts with a framework, explore their instinct — they have context you don't. Be deeply attentive, quietly useful, never performative.
`;

  return prompt;
}

function buildFrameworkPrompt(frameworkSlug: string, category?: string): string {
  // Find the framework across categories if no category specified
  if (!category) {
    const categories = getAllCategories();
    for (const cat of categories) {
      const frameworks = getCategoryFrameworks(cat.name);
      const found = frameworks.find(f => f.slug === frameworkSlug);
      if (found) {
        category = cat.name;
        break;
      }
    }
  }

  if (!category) {
    throw new Error(`Framework "${frameworkSlug}" not found in any category.`);
  }

  const body = loadFramework(category, frameworkSlug);
  if (!body) {
    throw new Error(`Framework "${frameworkSlug}" not found in category "${category}".`);
  }

  // Extract expert instructions for direct use
  const expertMatch = body.match(/\*\*Expert instructions\*\*:\n```\n([\s\S]*?)```/);
  const expertInstructions = expertMatch ? expertMatch[1].trim() : body;

  return `${expertInstructions}

Apply this framework fully to the user's situation. Be specific and rigorous.

Match the user's voice exactly. Listen before advising. If their instinct says something different, explore that first — they know their business. Be attentive, introspective, never performative.`;
}
