import { IModelReadRpcInterface, IModelTileRpcInterface, RpcInterfaceDefinition } from "@bentley/imodeljs-common";

/**
 * Returns a list of RPCs supported by this application
 */
export function getSupportedRpcs(): RpcInterfaceDefinition[] {
  return [
    IModelReadRpcInterface,
    IModelTileRpcInterface,
  ];
}
