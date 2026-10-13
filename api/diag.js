export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const customKeys = Object.keys(process.env).filter(k =>
    !k.startsWith('AWS_') &&
    !k.startsWith('VERCEL_') &&
    !k.startsWith('TURBO_') &&
    !k.startsWith('LD_') &&
    !k.startsWith('NODE_') &&
    !k.startsWith('npm_') &&
    !['PATH', 'PWD', 'SHLVL', 'LANG', 'TZ', 'OPENSSL_CONF', 'NOW_REGION', 'NX_DAEMON'].includes(k)
  );

  res.status(200).json({
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    vercelUrl: process.env.VERCEL_URL || 'unknown',
    branchUrl: process.env.VERCEL_BRANCH_URL || 'unknown',
    productionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL || 'unknown',
    customKeysFound: customKeys,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL)
  });
}
