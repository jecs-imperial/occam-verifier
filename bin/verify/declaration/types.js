"use strict";

const dom = require("occam-dom"),
      necessary = require("necessary");

const verifyType = require("../../verify/type"),
      nodeUtilities = require("../../utilities/node");

const { Query } = dom,
      { arrayUtilities } = necessary,
      { first } = arrayUtilities,
      { nameFromNameNode } = nodeUtilities;

const typeNameNameNodesQuery = Query.fromExpression("/*/typeName/@name"),
      typeNamesNameNodesQuery = Query.fromExpression("/*/typeNames//@name");

function verifyTypesDeclaration(typeDeclarationNode, fileContext) {
  let typeDeclarationVerified;

  const typeNamesNameNodes = typeNamesNameNodesQuery.execute(typeDeclarationNode),
        typeNames = typeNamesNameNodes.map((typeNamesNameNode) => nameFromNameNode(typeNamesNameNode)),
        typeNameNameNodes = typeNameNameNodesQuery.execute(typeDeclarationNode),
        superTypeNames = typeNameNameNodes.map((typeNameNameNode) => nameFromNameNode(typeNameNameNode)),
        firstSuperTypeName = first(superTypeNames),
        superTypeName = firstSuperTypeName, ///
        typesVerified = typeNames.every((typeName) => verifyType(typeName, superTypeName, fileContext));

  typeDeclarationVerified = typesVerified; ///

  return typeDeclarationVerified;
}

module.exports = verifyTypesDeclaration;
