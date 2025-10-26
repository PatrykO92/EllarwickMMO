export function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunck) => (data += chunck));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
