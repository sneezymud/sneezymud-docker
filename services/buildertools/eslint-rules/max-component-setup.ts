import type { Rule } from "eslint";

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

const DEFAULT_MAX = 40;

function getMax(options: readonly unknown[]): number {
  const opt = options[0];
  if (typeof opt !== "object" || opt === null || !("max" in opt))
    return DEFAULT_MAX;
  return typeof opt.max === "number" ? opt.max : DEFAULT_MAX;
}

// An if-without-else whose body ends with a return is a guard clause
// (rendering logic), not setup.
function isGuardClause(stmt: TSESTree.Statement): boolean {
  if (stmt.type === AST_NODE_TYPES.ReturnStatement) return true;
  if (stmt.type === AST_NODE_TYPES.IfStatement && !stmt.alternate) {
    const body = stmt.consequent;
    if (body.type === AST_NODE_TYPES.ReturnStatement) return true;
    if (body.type === AST_NODE_TYPES.BlockStatement) {
      const last = body.body.at(-1);
      return last?.type === AST_NODE_TYPES.ReturnStatement;
    }
  }
  return false;
}

function lineSpan(node: TSESTree.Node): number {
  return node.loc.end.line - node.loc.start.line + 1;
}

/**
 * Warns when a React component has too many lines of setup (state, hooks,
 * derived values) before its final return statement. Guard clauses
 * (if-without-else that return early) are excluded since they are rendering
 * logic, not setup.
 */
export const maxComponentSetup = {
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
      if (node.body.type !== AST_NODE_TYPES.BlockStatement) return;

      const statements = node.body.body;
      let lastReturnIdx = -1;
      for (let i = statements.length - 1; i >= 0; i--) {
        if (statements[i]?.type === AST_NODE_TYPES.ReturnStatement) {
          lastReturnIdx = i;
          break;
        }
      }

      if (lastReturnIdx < 0) return;
      const lastReturn = statements[lastReturnIdx];
      if (!lastReturn) return;

      const totalLinesBefore =
        lastReturn.loc.start.line - node.body.loc.start.line - 1;

      let guardLines = 0;
      for (let i = 0; i < lastReturnIdx; i++) {
        const stmt = statements[i];
        if (stmt && isGuardClause(stmt)) {
          guardLines += lineSpan(stmt);
        }
      }

      const setupLines = totalLinesBefore - guardLines;
      if (setupLines <= max) return;

      context.report({
        data: { lines: String(setupLines), max: String(max), name },
        loc: {
          end: { column: nameLoc.end.column, line: nameLoc.end.line },
          start: { column: nameLoc.start.column, line: nameLoc.start.line },
        },
        messageId: "tooMuchSetup",
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
      tooMuchSetup:
        "Component '{{name}}' has {{lines}} lines of setup before the return (max {{max}}). Consider extracting a custom hook.",
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
