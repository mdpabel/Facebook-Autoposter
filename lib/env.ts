function require(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const env = {
  get FB_APP_ID() { return require('FB_APP_ID'); },
  get FB_APP_SECRET() { return require('FB_APP_SECRET'); },
  get FB_PAGE_ID() { return require('FB_PAGE_ID'); },
  get FB_PAGE_ACCESS_TOKEN() { return require('FB_PAGE_ACCESS_TOKEN'); },
  get BASIC_AUTH_EMAIL() { return require('BASIC_AUTH_EMAIL'); },
  get BASIC_AUTH_PASSWORD() { return require('BASIC_AUTH_PASSWORD'); },
  get RSS_FEED_URL() { return require('RSS_FEED_URL'); },
  get CRON_SECRET() { return process.env.CRON_SECRET ?? null; },
};
