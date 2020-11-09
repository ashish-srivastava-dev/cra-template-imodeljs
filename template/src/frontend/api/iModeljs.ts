import { ClientRequestContext, Config } from "@bentley/bentleyjs-core";
import { BrowserAuthorizationCallbackHandler, BrowserAuthorizationClient, BrowserAuthorizationClientConfiguration } from "@bentley/frontend-authorization-client";
import { BentleyCloudRpcManager, BentleyCloudRpcParams } from "@bentley/imodeljs-common";
import { FrontendRequestContext, IModelApp } from "@bentley/imodeljs-frontend";
import { UrlDiscoveryClient } from "@bentley/itwin-client";
import { UiComponents } from "@bentley/ui-components";
import { getSupportedRpcs } from "../../common/rpcs";

/**
 * List of possible backends that iModeljs-app can use
 */
export enum UseBackend {
  /** Use local iModeljs-app backend */
  Local = 0,

  /** Use deployed general-purpose backend */
  GeneralPurpose = 1,
}

// Boiler plate code
export class iModeljsApp {

  public static get oidcClient() { return IModelApp.authorizationClient as BrowserAuthorizationClient; }

  public static async startup() {
    await IModelApp.startup({ applicationVersion: "1.0.0" });

    // initialize OIDC
      await iModeljsApp.initializeOidc();

    // contains various initialization promises which need
    // to be fulfilled before the app is ready
    const initPromises = new Array<Promise<any>>();

    // initialize RPC communication
      initPromises.push(iModeljsApp.initializeRpc());

    // initialize UiComponents
    initPromises.push(UiComponents.initialize(IModelApp.i18n));

    // the app is ready when all initialization promises are fulfilled
    await Promise.all(initPromises);
  }

  private static async initializeRpc(): Promise<void> {
    let rpcParams = await this.getConnectionInfo();
    const rpcInterfaces = getSupportedRpcs();
    // Initialize the local backend if UseBackend.GeneralPurpose is not set.
    if (!rpcParams)
      rpcParams = { info: { title: "iModeljs-app", version: "v1.0" }, uriPrefix: "http://localhost:3001" };
    BentleyCloudRpcManager.initializeClient(rpcParams, rpcInterfaces);
  }

  private static async initializeOidc() {
    const clientId = Config.App.getString("REACT_APP_AUTH_CLIENT_CLIENT_ID");
    const redirectUri = Config.App.getString("REACT_APP_AUTH_CLIENT_REDIRECT_URI");
    const scope = Config.App.getString("REACT_APP_AUTH_CLIENT_SCOPES");
    const responseType = "code";
    const oidcConfig: BrowserAuthorizationClientConfiguration = { clientId, redirectUri, scope, responseType };

    await BrowserAuthorizationCallbackHandler.handleSigninCallback(oidcConfig.redirectUri);
    IModelApp.authorizationClient = new BrowserAuthorizationClient(oidcConfig);

    try {
        await iModeljsApp.oidcClient.signInSilent(new ClientRequestContext());
    } catch (err) { }
  }

  private static async getConnectionInfo(): Promise<BentleyCloudRpcParams | undefined> {
    //const usedBackend = Config.App.getNumber("imjs_backend", UseBackend.Local);
      const usedBackend = UseBackend.GeneralPurpose;

    if (usedBackend === UseBackend.GeneralPurpose) {
      const urlClient = new UrlDiscoveryClient();
      const requestContext = new FrontendRequestContext();
      const orchestratorUrl = await urlClient.discoverUrl(requestContext, "iModelJsOrchestrator.K8S", undefined);
      return { info: { title: "general-purpose-imodeljs-backend", version: "v2.0" }, uriPrefix: orchestratorUrl };
    }

    if (usedBackend === UseBackend.Local)
      return undefined;

    throw new Error(`Invalid backend "${usedBackend}" specified in configuration`);
  }
}
