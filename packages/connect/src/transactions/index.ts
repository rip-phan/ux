import { UserSession, AppConfig } from 'blockstack';
import { SECP256K1Client, TokenSigner } from 'jsontokens';
import { defaultAuthURL } from '../auth';
import { popupCenter, setupListener } from '../popup';
import {
  ContractCallOptions,
  ContractCallPayload,
  ContractDeployOptions,
  ContractDeployPayload,
  FinishedTxData,
  TransactionPopup,
  TransactionOptions,
  STXTransferOptions,
  STXTransferPayload,
  TransactionPayload,
  TransactionTypes,
} from './types';

export * from './types';

const getKeys = (_userSession?: UserSession) => {
  let userSession = _userSession;

  if (!userSession) {
    const appConfig = new AppConfig(['store_write'], document.location.href);
    userSession = new UserSession({ appConfig });
  }

  const privateKey = userSession.loadUserData().appPrivateKey;
  const publicKey = SECP256K1Client.derivePublicKey(privateKey);

  return { privateKey, publicKey };
};

const signPayload = async (payload: TransactionPayload, privateKey: string) => {
  const tokenSigner = new TokenSigner('ES256k', privateKey);
  return tokenSigner.signAsync(payload as any);
};

const openTransactionPopup = async ({ token, opts }: TransactionPopup) => {
  const extensionURL = await window.BlockstackProvider?.getURL();
  const authURL = new URL(extensionURL || opts.authOrigin || defaultAuthURL);
  const urlParams = new URLSearchParams();
  urlParams.set('request', token);

  const popup = popupCenter({
    url: `${authURL.origin}/#/transaction?${urlParams.toString()}`,
    h: 700,
  });

  setupListener<FinishedTxData>({
    popup,
    authURL,
    finished: data => {
      if (opts.finished) {
        opts.finished(data);
      }
    },
    messageParams: {},
  });
  return popup;
};

export const makeContractCallToken = async (opts: ContractCallOptions) => {
  const { contractAddress, functionName, contractName, functionArgs, appDetails } = opts;
  const { privateKey, publicKey } = getKeys(opts.userSession);

  const payload: ContractCallPayload = {
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    txType: TransactionTypes.ContractCall,
    publicKey,
  };

  if (appDetails) {
    payload.appDetails = appDetails;
  }

  return signPayload(payload, privateKey);
};

export const makeContractDeployToken = async (opts: ContractDeployOptions) => {
  const { contractName, codeBody, appDetails } = opts;
  const { privateKey, publicKey } = getKeys(opts.userSession);

  const payload: ContractDeployPayload = {
    contractName,
    codeBody,
    publicKey,
    txType: TransactionTypes.ContractDeploy,
  };

  if (appDetails) {
    payload.appDetails = appDetails;
  }

  return signPayload(payload, privateKey);
};

export const makeSTXTransferToken = async (opts: STXTransferOptions) => {
  const { amount, recipient, memo, appDetails } = opts;
  const { privateKey, publicKey } = getKeys(opts.userSession);

  const payload: STXTransferPayload = {
    amount,
    recipient,
    memo,
    publicKey,
    txType: TransactionTypes.STXTransfer,
  };

  if (appDetails) {
    payload.appDetails = appDetails;
  }

  return signPayload(payload, privateKey);
};

async function generateTokenAndOpenPopup<T extends TransactionOptions>(
  opts: T,
  makeTokenFn: (opts: T) => Promise<string>
) {
  const token = await makeTokenFn(opts);
  return openTransactionPopup({ token, opts });
}

export const openContractCall = async (opts: ContractCallOptions) =>
  generateTokenAndOpenPopup(opts, makeContractCallToken);

export const openContractDeploy = async (opts: ContractDeployOptions) =>
  generateTokenAndOpenPopup(opts, makeContractDeployToken);

export const openSTXTransfer = async (opts: STXTransferOptions) =>
  generateTokenAndOpenPopup(opts, makeSTXTransferToken);
