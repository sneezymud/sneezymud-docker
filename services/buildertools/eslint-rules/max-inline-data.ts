import type { Rule } from "eslint";

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

const DEFAULT_MAX = 50;

function getMax(options: readonly unknown[]): number {
  const opt = options[0];
  if (typeof opt !== "object" || opt === null || !("max" in opt))
    return DEFAULT_MAX;
  return typeof opt.max === "number" ? opt.max : DEFAULT_MAX;
}

/**
 * Warns when a large array or object literal is defined inside a React
 * component. Large inline data structures should be extracted to module
 * scope or a separate file.
 *
 * Tracks component boundaries via PascalCase function declarations and
 * arrow/function expressions assigned to PascalCase variables.
 */
export const maxInlineData = {
  create(context: Rule.RuleContext) {
    const max = getMax(context.options);
    const componentStack: string[] = [];

    function checkLiteral(
      node: TSESTree.ArrayExpression | TSESTree.ObjectExpression,
    ) {
      const name = componentStack.at(-1);
      if (!name) return;

      const lines = node.loc.end.line - node.loc.start.line + 1;
      if (lines <= max) return;

      const kind =
        node.type === AST_NODE_TYPES.ArrayExpression ? "Array" : "Object";

      context.report({
        data: { kind, lines: String(lines), max: String(max), name },
        loc: {
          end: { column: node.loc.start.column + 1, line: node.loc.start.line },
          start: { column: node.loc.start.column, line: node.loc.start.line },
        },
        messageId: "tooLarge",
      });
    }

    return {
      ArrayExpression(node: TSESTree.ArrayExpression) {
        checkLiteral(node);
      },
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (node.id && /^[A-Z]/.test(node.id.name)) {
          componentStack.push(node.id.name);
        }
      },
      "FunctionDeclaration:exit"(node: TSESTree.FunctionDeclaration) {
        if (
          node.id &&
          /^[A-Z]/.test(node.id.name) &&
          componentStack.at(-1) === node.id.name
        ) {
          componentStack.pop();
        }
      },
      ObjectExpression(node: TSESTree.ObjectExpression) {
        checkLiteral(node);
      },
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          /^[A-Z]/.test(node.id.name) &&
          node.init &&
          (node.init.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            node.init.type === AST_NODE_TYPES.FunctionExpression)
        ) {
          componentStack.push(node.id.name);
        }
      },
      "VariableDeclarator:exit"(node: TSESTree.VariableDeclarator) {
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          /^[A-Z]/.test(node.id.name) &&
          node.init &&
          (node.init.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            node.init.type === AST_NODE_TYPES.FunctionExpression) &&
          componentStack.at(-1) === node.id.name
        ) {
          componentStack.pop();
        }
      },
    };
  },
  meta: {
    messages: {
      tooLarge:
        "{{kind}} literal inside '{{name}}' spans {{lines}} lines (max {{max}}). Consider extracting to a separate file or module-scope constant.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          max: { minimum: 1, type: "integer" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  } satisfies Rule.RuleModule["meta"],
};
