import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { useSettingsStore } from './store';
import { useMemo } from 'react';

export function useWooRest() {
  const { storeUrl, consumerKey, consumerSecret } = useSettingsStore();

  return useMemo(() => {
    if (!storeUrl || !consumerKey || !consumerSecret) return null;
    
    // Derive the REST URL from the GraphQL URL (e.g. remove /graphql)
    const restUrl = storeUrl.replace(/\/graphql\/?$/, '');

    return new WooCommerceRestApi({
      url: restUrl,
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
      version: 'wc/v3',
      queryStringAuth: true // Force Basic Authentication as query string true and using under HTTPS
    });
  }, [storeUrl, consumerKey, consumerSecret]);
}
