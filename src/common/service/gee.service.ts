const ee = require('@google/earthengine');
import * as fs from "fs";
import * as path from "path";

// Path to your GEE service account key
const KEY_FILE = path.join(process.cwd(), "gee-key.json");

// Initialize only once
if (!(ee as any)._initialized) {
  const privateKey = JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));

  ee.data.authenticateViaPrivateKey(
    privateKey,
    () => {
      ee.initialize(
        null,
        null,
        () => console.log("✅ Google Earth Engine initialized"),
        (err) => console.error("❌ GEE init error", err)
      );
    },
    (err) => console.error("❌ GEE auth error", err)
  );

  (ee as any)._initialized = true;
}

export default ee;
