import { initConfig } from "../account/common";
import { privateKeyToCkbAddress } from "../modules/utils";
import { privKeys } from "./accounts";
import fetch from "node-fetch";

(async () => {
  // init testnet LUMOS_CONFIG
  initConfig();
  for (const pk of privKeys.reverse().slice(0, 100)) {
    console.log(pk);
    const addr = privateKeyToCkbAddress(pk);
    console.log(addr);
    let res = await fetch("https://faucet.nervos.org/claim_events", {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,zh-TW;q=0.6",
        "content-type": "application/json",
        "sec-ch-ua":
          '" Not A;Brand";v="99", "Chromium";v="99", "Google Chrome";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Linux"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-csrf-token":
          "nVPJ5tZ5/WZZVhO7pTHd6swLIVTUpUQem8cHPgAY1nLYSJxLKJlgRnW4wq+SlnCX8vJ9JghMchxqeMbCRN9d5w==",
      },
      body: `{\"claim_event\":{\"address_hash\":\"${addr}\"}}`,
      method: "POST",
    });
    console.log(res);
  }
  // const browser = await puppeteer.launch({ headless: true });
  // const page = await browser.newPage();
  // await page.goto('https://faucet.nervos.org', {
  // waitUntil: 'networkidle2',
  // });
})();
