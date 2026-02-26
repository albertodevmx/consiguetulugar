export const environment = {
  production: false,
  stripe: {
    publishableKey: 'pk_live_51Sz4SUF6dierXOV1FuvXOpUTySYHJdnfFFMIxj5pFQd2pn2TyC6f0sUoYf5gkVaE6rgrLqpapwMBNeaumzxOH7Il00QOsvW7pI',
    priceId: 'price_1T2P5NF6dierXOV14OC12DVk',
  },
  // In development, routed through Angular dev server proxy (see proxy.conf.json)
  // In production, replaced by environment.production.ts with full Cloud Functions URL
  functionsUrl: '',
};
