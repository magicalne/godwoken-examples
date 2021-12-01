import puppeteer from "puppeteer";
import { initConfig } from "../account/common";
import { privateKeyToCkbAddress } from "../modules/utils";
import { privKeys } from "./accounts";

(async () => {
  initConfig();

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://faucet.nervos.org', {
    waitUntil: 'networkidle2',
  });

  for await (const privKey of privKeys.reverse()) {
    const ckbAddress = privateKeyToCkbAddress(privKey);

    // Enter one aggron wallet address
    let input = await page.$('input[name=address_hash]');
    if (!input) continue;
    await input.click({ clickCount: 3 });
    await input.type(ckbAddress,
      { delay: 50 } // Types slower, like a user
    );

    // Trigger the `Claim` Button
    await page.click('button', { delay: 200 });

    console.log(`Claimed testnet 10000 CKB from the faucet for ${ckbAddress}`);
  }

  await browser.close();
})();