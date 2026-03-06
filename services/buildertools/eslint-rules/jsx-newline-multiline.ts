import type { Rule } from "eslint";

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

type JsxParent = TSESTree.JSXElement | TSESTree.JSXFragment;
type JsxSibling =
  | TSESTree.JSXElement
  | TSESTree.JSXExpressionContainer
  | TSESTree.JSXFragment;

/**
 * Enforces blank line usage between adjacent JSX siblings based on whether
 * either sibling is multiline:
 * - If either sibling spans multiple lines: require a blank line between them
 * - If both siblings are single-line: forbid a blank line between them
 *
 * Non-whitespace text nodes (JSXText) break adjacency - inline prose mixed
 * with elements is left alone. Applies in both JSXElements and JSXFragments.
 */
export const jsxNewlineMultiline = {
  create(context: Rule.RuleContext) {
    function check(node: JsxParent) {
      if (node.children.length < 2) {
        return;
      }

      let prev: JsxSibling | null = null;

      for (const child of node.children) {
        if (child.type === AST_NODE_TYPES.JSXText) {
          if (child.value.trim()) {
            prev = null;
          }
          continue;
        }

        if (
          child.type !== AST_NODE_TYPES.JSXElement &&
          child.type !== AST_NODE_TYPES.JSXExpressionContainer &&
          child.type !== AST_NODE_TYPES.JSXFragment
        ) {
          continue;
        }

        if (prev) {
          const prevMultiline = prev.loc.start.line !== prev.loc.end.line;
          const childMultiline = child.loc.start.line !== child.loc.end.line;
          const hasBlankLine = child.loc.start.line - prev.loc.end.line > 1;

          if ((prevMultiline || childMultiline) && !hasBlankLine) {
            const fixPrev = prev;
            context.report({
              fix(fixer) {
                const textBetween = context.sourceCode.text.slice(
                  fixPrev.range[1],
                  child.range[0],
                );
                return fixer.replaceTextRange(
                  [fixPrev.range[1], child.range[0]],
                  textBetween.replace("\n", "\n\n"),
                );
              },
              loc: child.loc,
              messageId: "missing",
            });
          } else if (!prevMultiline && !childMultiline && hasBlankLine) {
            const fixPrev = prev;
            context.report({
              fix(fixer) {
                const textBetween = context.sourceCode.text.slice(
                  fixPrev.range[1],
                  child.range[0],
                );
                return fixer.replaceTextRange(
                  [fixPrev.range[1], child.range[0]],
                  textBetween.replace(/\n\s*\n/, "\n"),
                );
              },
              loc: child.loc,
              messageId: "extra",
            });
          }
        }

        prev = child;
      }
    }

    return {
      JSXElement: check,
      JSXFragment: check,
    };
  },
  meta: {
    fixable: "whitespace",
    messages: {
      extra: "Unexpected blank line between single-line JSX siblings.",
      missing: "Expected blank line between multiline JSX siblings.",
    },
    schema: [],
    type: "layout",
  } satisfies Rule.RuleModule["meta"],
};
