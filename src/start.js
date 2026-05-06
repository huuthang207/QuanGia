require("dotenv").config();
const { deployCommands } = require("./commands");

async function main() {
  // Nếu bạn muốn luôn deploy mỗi lần start:
  // await deployCommands();

  // Khuyên dùng: chỉ deploy khi set env DEPLOY_COMMANDS=1
  if (process.env.DEPLOY_COMMANDS === "1") {
    console.log("🔧 DEPLOY_COMMANDS=1 -> Deploying slash commands...");
    await deployCommands();
  } else {
    console.log(
      "ℹ️ Skipping deploy (set DEPLOY_COMMANDS=1 to deploy on startup).",
    );
  }

  // Start bot
  require("./index");
}

main().catch((err) => {
  console.error("❌ Startup failed:", err);
  process.exit(1);
});
