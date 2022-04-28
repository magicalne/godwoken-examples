import { CkbUser } from "../user";
import { Browser } from "puppeteer";

export async function faucet(
  browser: Browser,
  ckbUser: CkbUser,
  retries: number = 0
): Promise<boolean> {
  if (retries >= 10) {
    return false;
  }

  const page = await browser.newPage();
  await page.goto("https://faucet.nervos.org", {
    waitUntil: "networkidle2",
  });

  let input = await page.$("input[name=address_hash]");
  if (!input) {
    return faucet(browser, ckbUser, retries + 1);
  }

  await input.click({ clickCount: 3 });
  await input.type(
    ckbUser.ckbAddress(),
    { delay: 50 } // Types slower, like a user
  );

  // Trigger the `Claim` Button
  await page.click("button", { delay: 200 });

  console.log(
    `Claimed testnet 10000 CKB from the faucet for ${ckbUser.ckbAddress()}`
  );
  return true;
}
