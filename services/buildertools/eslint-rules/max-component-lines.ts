import type { Rule } from "eslint";

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

const DEFAULT_MAX = 100;

function getMax(options: readonly unknown[]): number {
  const opt = options[0];
  if (typeof opt !== "object" || opt === null || !("max" in opt))
    return DEFAULT_MAX;
  return typeof opt.max === "number" ? opt.max : DEFAULT_MAX;
}

/**
 * Warns when a React component (PascalCase function returning JSX) exceeds
 * a configurable line count. Catches function declarations and arrow/function
 * expressions assigned to PascalCase variables.
 */
export const maxComponentLines = {
  create(context: Rule.RuleContext) {
    const max = getMax(context.options);

    function check(
      node:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression,
      nameLoc: TSESTree.SourceLocation,
      name: string,
    ) {
      const lines = node.loc.end.line - node.loc.start.line + 1;
      if (lines <= max) return;

      context.report({
        data: { lines: String(lines), max: String(max), name },
        loc: {
          end: { column: nameLoc.end.column, line: nameLoc.end.line },
          start: { column: nameLoc.start.column, line: nameLoc.start.line },
        },
        messageId: "tooLong",
      });
    }

    return {
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (node.id && /^[A-Z]/.test(node.id.name)) {
          check(node, node.id.loc, node.id.name);
        }
      },
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          /^[A-Z]/.test(node.id.name) &&
          node.init &&
          (node.init.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            node.init.type === AST_NODE_TYPES.FunctionExpression)
        ) {
          check(node.init, node.id.loc, node.id.name);
        }
      },
    };
  },
  meta: {
    messages: {
      tooLong:
        "Component '{{name}}' is {{lines}} lines (max {{max}}). Consider extracting sub-components or hooks.",
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
