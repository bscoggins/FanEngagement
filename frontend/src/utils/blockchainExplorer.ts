import type { BlockchainType } from '../types/api';

interface ExplorerConfig {
  explorerName: string;
  baseUrl: string;
  clusterParam?: string;
  networkLabel?: string;
}

const parseNetwork = (blockchainConfig?: string | null): string | undefined => {
  if (!blockchainConfig) return undefined;
  try {
    const parsed = JSON.parse(blockchainConfig);
    const network = parsed?.network;
    return typeof network === 'string' ? network.trim().toLowerCase() : undefined;
  } catch {
    return undefined;
  }
};

const getPolygonExplorer = (network?: string): ExplorerConfig => {
  switch (network) {
    case 'amoy':
      return { explorerName: 'PolygonScan', baseUrl: 'https://amoy.polygonscan.com', networkLabel: 'amoy' };
    case 'mumbai':
      return { explorerName: 'PolygonScan', baseUrl: 'https://mumbai.polygonscan.com', networkLabel: 'mumbai' };
    case 'polygon':
    case 'mainnet':
      return { explorerName: 'PolygonScan', baseUrl: 'https://polygonscan.com', networkLabel: 'polygon' };
    default:
      return { explorerName: 'PolygonScan', baseUrl: 'https://polygonscan.com', networkLabel: network };
  }
};

const getSolanaExplorer = (network?: string): ExplorerConfig => {
  if (!network) {
    return { explorerName: 'Solana Explorer', baseUrl: 'https://explorer.solana.com', clusterParam: 'devnet', networkLabel: 'devnet' };
  }

  const normalized = network.toLowerCase();
  switch (normalized) {
    case 'mainnet':
    case 'mainnet-beta':
      return { explorerName: 'Solana Explorer', baseUrl: 'https://explorer.solana.com', networkLabel: 'mainnet-beta' };
    case 'testnet':
      return { explorerName: 'Solana Explorer', baseUrl: 'https://explorer.solana.com', clusterParam: 'testnet', networkLabel: 'testnet' };
    case 'localnet':
    case 'local':
      return { explorerName: 'Solana Explorer', baseUrl: 'https://explorer.solana.com', clusterParam: 'custom', networkLabel: normalized };
    default:
      return { explorerName: 'Solana Explorer', baseUrl: 'https://explorer.solana.com', clusterParam: normalized, networkLabel: normalized };
  }
};

export const getExplorerConfig = (
  blockchainType?: BlockchainType,
  blockchainConfig?: string | null
): ExplorerConfig | undefined => {
  if (!blockchainType || blockchainType === 'None') return undefined;

  const network = parseNetwork(blockchainConfig);

  if (blockchainType === 'Polygon') {
    return getPolygonExplorer(network);
  }

  if (blockchainType === 'Solana') {
    return getSolanaExplorer(network);
  }

  return undefined;
};

export const buildExplorerLinks = ({
  blockchainType,
  blockchainConfig,
  transactionId,
  address,
}: {
  blockchainType?: BlockchainType;
  blockchainConfig?: string | null;
  transactionId?: string | null;
  address?: string | null;
}) => {
  const config = getExplorerConfig(blockchainType, blockchainConfig);
  if (!config) {
    return { explorerName: undefined, transactionUrl: undefined, addressUrl: undefined, networkLabel: undefined };
  }

  const withCluster = (path: string) => {
    if (!config.clusterParam) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}cluster=${config.clusterParam}`;
  };

  const transactionUrl = transactionId
    ? withCluster(`${config.baseUrl}/tx/${transactionId}`)
    : undefined;
  const addressUrl = address
    ? withCluster(`${config.baseUrl}/address/${address}`)
    : undefined;

  return {
    explorerName: config.explorerName,
    transactionUrl,
    addressUrl,
    networkLabel: config.networkLabel,
  };
};

export const validateBlockchainConfig = (
  blockchainType: BlockchainType,
  blockchainConfig?: string | null
): string[] => {
  if (blockchainType === 'None') {
    return [];
  }

  if (!blockchainConfig?.trim()) {
    return [`${blockchainType} blockchain requires adapterUrl, network, and apiKey.`];
  }

  try {
    const parsed = JSON.parse(blockchainConfig);
    const errors: string[] = [];
    const adapterUrl = parsed?.adapterUrl;
    const network = parsed?.network;
    const apiKey = parsed?.apiKey;

    if (!adapterUrl || typeof adapterUrl !== 'string') {
      errors.push(`${blockchainType} blockchain requires adapterUrl.`);
    } else if (!/^https?:\/\//i.test(adapterUrl)) {
      errors.push(`${blockchainType} adapterUrl must be an absolute http(s) URL.`);
    } else {
      try {
        const parsedUrl = new URL(adapterUrl);
        const host = parsedUrl.hostname.toLowerCase();
        const isLocalhost =
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host === '::1';

        if (parsedUrl.protocol !== 'https:' && !isLocalhost) {
          errors.push(`${blockchainType} adapterUrl must use https (http is only allowed for localhost).`);
        }
      } catch {
        errors.push(`${blockchainType} adapterUrl must be a valid URL.`);
      }
    }

    if (!network || typeof network !== 'string' || !network.trim()) {
      errors.push(`${blockchainType} blockchain requires network.`);
    }

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      errors.push(`${blockchainType} blockchain requires apiKey.`);
    } else {
      const trimmedApiKey = apiKey.trim();
      if (trimmedApiKey.length < 16) {
        errors.push(`${blockchainType} apiKey appears invalid; expected at least 16 characters.`);
      }
    }

    return errors;
  } catch {
    return [`${blockchainType} blockchain config must be valid JSON with adapterUrl, network, and apiKey.`];
  }
};
