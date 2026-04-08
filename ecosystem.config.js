module.exports = {
  apps: [
    {
      name: "danabri",
      script: "./node_modules/next/dist/bin/next",
      cwd: "C:/inetpub/wwwroot/danabri_panel",
      interpreter: "node",
      args: "dev -p 3000 -H 0.0.0.0",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};