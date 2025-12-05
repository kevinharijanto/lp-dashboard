import { classifyHistory } from "./src/lib/history";

const wallet = "0x7f02609ccfb440aa98a95b5ec6814bfe7f6cd406";
const url = `https://api.rabby.io/v1/user/history_list?id=${wallet}&start_time=0&page_count=200`;

async function main() {
  const resp = await fetch(url);
  const json = await resp.json();
  const txs = classifyHistory(json);
  for (const tx of txs.filter((t) => t.projectId === "hyper_prjx")) {
    console.log(tx.hash, tx.category, tx.tokensIn.length, tx.tokensOut.length);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
