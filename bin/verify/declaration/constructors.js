"use strict";

const necessary = require("necessary");

const Error = require("../../error"),
      queries = require("../../miscellaneous/queries"),
      Constructor = require("../../constructor"),
      nodeUtilities = require("../../utilities/node"),
      verifyTypeName = require("../../verify/typeName"),
      verifyConstructorOperator = require("../../verify/constructorOperator");

const { arrayUtilities } = necessary,
      { first } = arrayUtilities,
      { nodeAsString } = nodeUtilities,
      { verifyTermAsConstructor } = verifyConstructorOperator,
      { termNodesQuery, typeNameTerminalNodeQuery } = queries;

function verifyConstructorsDeclaration(constructorDeclarationNode, fileContext) {
  let type = undefined;

  const termNodes = termNodesQuery(constructorDeclarationNode),
        firstTermNode = first(termNodes),
        termNode = firstTermNode, ///
        typeNameTerminalNode = typeNameTerminalNodeQuery(constructorDeclarationNode);

  if (typeNameTerminalNode !== undefined) {
    type = verifyTypeName(typeNameTerminalNode, fileContext);

    if (type === undefined) {
      const node = termNode,  ///
            termString = nodeAsString(termNode),
            message = `The constructor '${termString}' cannot be verified because the type cannot be found.`;

      throw new Error(node, message);
    }
  }

  termNodes.forEach((termNode) => {
    const verified = verifyTermAsConstructor(termNode, fileContext);

    if (!verified) {
      const node = termNode,  ///
            termString = nodeAsString(termNode),
            message = `The constructor '${termString}' cannot be verified.`;

      throw new Error(node, message);
    }

    const constructor = Constructor.fromTermNodeAndType(termNode, type),
          constructorString = constructor.asString();

    fileContext.addConstructor(constructor);

    console.log(`Verified the '${constructorString}' constructor.`);
  });
}

module.exports = verifyConstructorsDeclaration;
