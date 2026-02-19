export const environment = {
  production: false,
  stripe: {
    publishableKey: 'pk_live_51Sz4SUF6dierXOV1FuvXOpUTySYHJdnfFFMIxj5pFQd2pn2TyC6f0sUoYf5gkVaE6rgrLqpapwMBNeaumzxOH7Il00QOsvW7pI',
    // This is set after creating a Product + Price in Stripe Dashboard
    priceId: 'price_1T2P5NF6dierXOV14OC12DVk',
  },
  // Cloud Function URL — set after deploying functions
  functionsUrl: 'https://us-central1-estudiarbarato.cloudfunctions.net',
};
