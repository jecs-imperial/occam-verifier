'use strict';

const parsers = require('occam-parsers');

const Error = require('../error'),
      queries = require('../miscellaneous/queries'),
      SubTerm = require('../miscellaneous/subTerm'),
      emptyType = require('../miscellaneous/emptyType'),
      ruleNames = require('../miscellaneous/ruleNames'),
      nodeUtilities = require('../utilities/node'),
      ruleUtilities = require('../utilities/rule'),
      Configuration = require('../miscellaneous/configuration'),
      SubExpression = require('../miscellaneous/subExpression');

const { partTypes } = parsers,
      { findRuleByName } = ruleUtilities,
      { RuleNamePartType,
        OptionalPartPartType,
        GroupOfPartsPartType,
        ChoiceOfPartsPartType,
        OneOrMorePartsPartType,
        ZeroOrMorePartsPartType } = partTypes,
      { nodeAsString, cloneChildNodes } = nodeUtilities,
      { nameTerminalNodeQuery, termNameTerminalNodeQuery } = queries,
      { NAME_RULE_NAME, TERM_RULE_NAME, EXPRESSION_RULE_NAME } = ruleNames;

function verifyTerm(termNode, context, rules) {
  let type = undefined;

  if (type === undefined) {
    type = verifyTermNodeAgainstConstructors(termNode, context, rules);
  }

  if (type === undefined) {
    type = verifyTermNodeAgainstVariables(termNode, context, rules);
  }

  return type;
}

function verifyStatement(statementNode, context, rules) {
  const statementRule = findRuleByName('statement', rules),
        node = statementNode, ///
        rule = statementRule, ///
        type = verifyWithRule(node, rule, context, rules),
        verified = (type !== undefined);

  if (!verified) {
    const node = statementNode,  ///
          statementString = nodeAsString(statementNode),
          message = `The statement '${statementString}' cannot be verified.`;

    throw new Error(node, message);
  }
}

function verifyExpression(expressionNode, context, rules) {
  const expressionRule = findRuleByName('expression', rules),
        node = expressionNode,  ///
        rule = expressionRule,  ///
        type = verifyWithRule(node, rule, context, rules);

  if (type === undefined) {
    const node = expressionNode,  ///
          expressionString = nodeAsString(expressionNode),
          message = `The expression '${expressionString}' cannot be verified.`;

    throw new Error(node, message);
  }

  return type;
}

module.exports = {
  verifyTerm,
  verifyStatement,
  verifyExpression
};

function verifyTermNodeAgainstConstructors(termNode, context, rules) {
  let type = undefined;

  const constructors = context.getConstructors();

  constructors.some((constructor) => {
    const constructorTermNode = constructor.getTermNode(),
        verified = verifyTermNode(termNode, constructorTermNode, context, rules);

    if (verified) {
      type = constructor.getType();

      return true;
    }
  });

  return type;
}

function verifyTermNodeAgainstVariables(termNode, context, rules) {
  let type = undefined;

  const termNameTerminalNode = termNameTerminalNodeQuery(termNode);

  if (termNameTerminalNode !== undefined) {
    const termNameTerminalNodeContent = termNameTerminalNode.getContent(),
          name = termNameTerminalNodeContent, ///
          variable = context.findVariableByName(name);

    if (variable !== undefined) {
      type = variable.getType();
    }
  }

  return type;
}

function verifyTermNode(termNode, constructorTermNode, context, rules) {
  let verified;

  const node = termNode, ///
        subTerms = [],
        childNodes = cloneChildNodes(node),
        subExpressions = [],
        constructorNode = constructorTermNode, ///
        constructorChildNodes = cloneChildNodes(constructorNode);

  verified = verifyChildNodes(childNodes, constructorChildNodes, context, rules, subTerms, subExpressions);

  if (verified) {
    verified = subTerms.every((subTerm) => {
      const termNode = subTerm.getTermNode(),
            constructorTermNode = subTerm.getConstructorTermNode(),
            verified = verifyTermNode(termNode, constructorTermNode, context, rules);

      return verified;
    });
  }

  if (verified) {
    subExpressions.forEach((subExpression) => subExpression.verify(termNode, context, rules, verifyExpression));
  }

  return verified;
}

function verifyNode(node, constructorNode, context, rules, subTerms, subExpressions) {
  let verified;

  const nodeTerminalNode = node.isTerminalNode();

  if (nodeTerminalNode) {
    const terminalNode = node;  ///

    verified = verifyTerminalNode(terminalNode, constructorNode, context, rules);
  } else {
    const nonTerminalNode = node; ///

    verified = verifyNonTerminalNode(nonTerminalNode, constructorNode, context, rules, subTerms, subExpressions);
  }

  return verified;
}

function verifyChildNodes(childNodes, constructorChildNodes, context, rules, subTerms, subExpressions) {
  let verified = false;

  let childNode = childNodes.shift(),
      constructorChildNode = constructorChildNodes.shift();

  while (childNode !== undefined) {
    if (constructorChildNode === undefined) {
      break;
    }

    const node = childNode, ///
          constructorNode = constructorChildNode; ///

    verified = verifyNode(node, constructorNode, context, rules, subTerms, subExpressions);

    if (!verified) {
      break;
    }

    childNode = childNodes.shift();
    constructorChildNode = constructorChildNodes.shift();
  }

  if (verified) {
    if (constructorChildNode !== undefined) {
      verified = false;
    }
  }

  return verified;
}

function verifyTerminalNode(terminalNode, constructorNode, context, rules) {
  let verified = false;

  const constructorNodeTerminalNode = constructorNode.isTerminalNode();

  if (constructorNodeTerminalNode) {
    const terminalNodeType = terminalNode.getType(),
          constructorTerminalNode = constructorNode,  ///
          constructorTerminalNodeType = constructorTerminalNode.getType();

    if (terminalNodeType === constructorTerminalNodeType) {
      const terminalNodeContent = terminalNode.getContent(),
            constructorTerminalNodeContent = constructorTerminalNode.getContent();

      if (terminalNodeContent === constructorTerminalNodeContent) {
        verified = true;
      }
    }
  }

  return verified;
}

function verifyNonTerminalNode(nonTerminalNode, constructorNode, context, rules, subTerms, subExpressions) {
  let verified = false;

  const constructorNodeNonTerminalNode = constructorNode.isNonTerminalNode();

  if (constructorNodeNonTerminalNode) {
    const ruleName = nonTerminalNode.getRuleName(),
          constructorRuleName = constructorNode.getRuleName();

    if (ruleName === constructorRuleName) {
      switch (ruleName) {
        case NAME_RULE_NAME : {
          const node = nonTerminalNode, ///
                nameTerminalNode = nameTerminalNodeQuery(node),
                constructorNameTerminalNode = nameTerminalNodeQuery(constructorNode);

          verified = verifyNameTerminalNode(nameTerminalNode, constructorNameTerminalNode, context, rules);

          break;
        }

        case TERM_RULE_NAME : {
          const termNode = nonTerminalNode,  ///
                constructorTermNode = constructorNode,  ///
                subTerm = SubTerm.fromTermNodeAndConstructorTermNode(termNode, constructorTermNode);

          subTerms.push(subTerm);

          verified = true;  ///

          break;
        }

        case EXPRESSION_RULE_NAME : {
          const expressionNode = nonTerminalNode,  ///
                constructorTermNode = constructorNode,  ///
                subExpression = SubExpression.fromExpressionNodeAndConstructorTermNode(expressionNode, constructorTermNode);

          subExpressions.push(subExpression);

          verified = true;  ///

          break;
        }

        default: {
          const node = nonTerminalNode, ///
                childNodes = cloneChildNodes(node),
                constructorChildNodes = cloneChildNodes(constructorNode);

          verified = verifyChildNodes(childNodes, constructorChildNodes, context, rules, subTerms, subExpressions);
        }
      }
    }
  }

  return verified;
}

function verifyNameTerminalNode(nameTerminalNode, constructorNameTerminalNode, context, rules) {
  let verified = false;

  const nameTerminalNodeContent = nameTerminalNode.getContent(),
        name = nameTerminalNodeContent, ///
        variable = context.findVariableByName(name);

  if (variable !== undefined) {
    const constructorNameTerminalNodeContent = constructorNameTerminalNode.getContent(),
          constructorName = constructorNameTerminalNodeContent;  ///

    if (constructorName === name) {
      verified = true;
    } else {
      const name = constructorName, ///
            type = context.findTypeByName(name),
            variableType = variable.getType(),
            variableTypeEqualToOrSubTypeOfType = variableType.isEqualToOrSubTypeOf(type);

      verified = variableTypeEqualToOrSubTypeOfType;  ///
    }
  }

  return verified;
}

function verifyWithRule(node, rule, context, rules) {
  let type = undefined;

  const definitions = rule.getDefinitions();

  definitions.some((definition) => {
    type = verifyWithDefinition(node, definition, context, rules);

    if (type !== undefined) {
      return true;
    }
  });

  return type;
}

function verifyWithDefinition(node, definition, context, rules) {
  let type = undefined;

  const parts = definition.getParts(),
        childNodes = cloneChildNodes(node);

  parts.every((part) => {
    const partType = verifyWithPart(childNodes, part, context, rules);

    if (partType !== undefined) {
      if (type === undefined) {
        type = partType;  ///

        return true;
      }

      if (partType === emptyType) {
        return true;
      }

      const partTypeEqualToOrSubTypeOfType = partType.isEqualToOrSubTypeOf(type);

      if (partTypeEqualToOrSubTypeOfType) {
        return true;
      }

      const typeSubTypeOfPartType = type.isSubTypeOf(partType);

      if (typeSubTypeOfPartType) {
        type = partType;  ///

        return true;
      }

      type = undefined;
    }
  });

  return type;
}

function verifyWithPart(childNodes, part, context, rules) {
  let type = undefined;

  const partTerminalPart = part.isTerminalPart();

  if (partTerminalPart) {
    const terminalPart = part;  ///

    type = verifyWithTerminalPart(childNodes, terminalPart, context, rules);
  } else {
    const nonTerminalPart = part; ///

    type = verifyWithNonTerminalPart(childNodes, nonTerminalPart, context, rules);
  }

  return type;
}

function verifyWithTerminalPart(childNodes, terminalPart, context, rules) {
  let type = undefined;

  const childNode = childNodes.shift();

  if (childNode !== undefined) {
    const childNodeTerminalNode = childNode.isTerminalNode();

    if (childNodeTerminalNode) {
      let terminalNode = childNode; ///

      const significantToken = terminalNode.getSignificantToken(),
            configuration = Configuration.fromSignificantToken(significantToken);

      terminalNode = terminalPart.parse(configuration);

      if (terminalNode !== undefined) {
        type = emptyType; ///
      }
    }
  }

  return type;
}

function verifyWithNonTerminalPart(childNodes, nonTerminalPart, context, rules) {
  let type = undefined;

  const nonTerminalPartType = nonTerminalPart.getType();

  switch (nonTerminalPartType) {
    case RuleNamePartType :
      const ruleNamePart = nonTerminalPart;  ///

      type = verifyWithRuleNamePart(childNodes, ruleNamePart, context, rules);
      break;

    case OptionalPartPartType:
      const optionalPartPart = nonTerminalPart; ///

      type = verifyWithOptionalPartPart(childNodes, optionalPartPart, context, rules);
      break;

    default:

      debugger
  }

  return type;
}

function verifyWithRuleNamePart(childNodes, ruleNamePart, context, rules) {
  let type = undefined;

  const childNode = childNodes.shift();

  if (childNode !== undefined) {
    const childNodeNonTerminalNode = childNode.isNonTerminalNode();

    if (childNodeNonTerminalNode) {
      const ruleName = ruleNamePart.getRuleName(),
            nonTerminalNode = childNode,  ///
            nonTerminalNodeRuleName = nonTerminalNode.getRuleName();

      if (ruleName === nonTerminalNodeRuleName) {
        switch (ruleName) {
          case TERM_RULE_NAME : {
            const termNode = nonTerminalNode;

            type = verifyTerm(termNode, context, rules);

            break;
          }

          case EXPRESSION_RULE_NAME : {
            const expressionNode = nonTerminalNode;  ///

            type = verifyExpression(expressionNode, context, rules);

            break;
          }

          default : {
            const name = ruleName,  ///
                  node = nonTerminalNode, ///
                  rule = findRuleByName(name, rules);

            type = verifyWithRule(node, rule, context, rules);

            break;
          }
        }
      }
    }
  }

  return type;
}

function verifyWithOptionalPartPart(childNodes, optionalPartPart, context, rules) {
  const part = optionalPartPart.getPart();

  childNodes = ChildNodes.fromChildNodes(childNodes); ///

  let type = verifyWithPart(childNodes, part, context, rules);

  if (type === undefined) {
    childNodes.backtrack();

    type = emptyType; ///
  }

  return type;
}