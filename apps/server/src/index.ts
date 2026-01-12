import { createApp } from './app.js';

const PORT = parseInt(process.env.PORT || '4100', 10);

async function main() {
  const app = await createApp();

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🎮 QuestLog server running at http://localhost:${PORT}`);
    console.log(`📚 API Docs available at http://localhost:${PORT}/api/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
