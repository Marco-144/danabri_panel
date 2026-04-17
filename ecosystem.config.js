module.exports = {
  apps: [
    {
      name: "danabri-local",
      script: "./node_modules/next/dist/bin/next",
      cwd: __dirname,
      interpreter: "node",
      args: "dev -p 3000 -H 0.0.0.0",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};