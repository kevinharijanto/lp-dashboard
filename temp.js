const https = require("https");
const wallet = "0x7f02609ccfb440aa98a95b5ec6814bfe7f6cd406";
function fetch(start) {
  return new Promise((resolve, reject) => {
    const url = `https://api.rabby.io/v1/user/history_list?id=${wallet}&start_time=${start}&page_count=500`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        resolve(JSON.parse(data));
      });
    }).on("error", reject);
  });
}
(async () => {
  let start = 0;
  for (let page = 0; page < 3; page++) {
    const json = await fetch(start);
    if (json.history_list.length === 0) break;
    let min = Number.MAX_SAFE_INTEGER;
    for (const item of json.history_list) {
      if (item.time_at < min) min = item.time_at;
      if (item.project_id === "hyper_prjx" && item.tx.name === "multicall") {
        console.log("page", page, "time", item.time_at, "sends", JSON.stringify(item.sends), "receives", JSON.stringify(item.receives));
      }
    }
    if (json.history_list.length < 500) break;
    start = min;
  }
})();
