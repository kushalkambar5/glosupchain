module.exports = {
  apps: [
    {
      name: 'agent-api',
      script: './.venv/bin/uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8000',
      interpreter: 'none',
      env: {
        PYTHONPATH: '.',
        // Add other env vars here if not in .env
      }
    },
    {
      name: 'shipway-tool',
      script: './.venv/bin/python',
      args: 'tools/shipway_tool.py',
      interpreter: 'none',
      cron_restart: '0 0,6,12,18 * * *',
      autorestart: false,
      env: {
        PYTHONPATH: '.'
      }
    },
    {
      name: 'weather-tool',
      script: './.venv/bin/python',
      args: 'tools/weather_tool.py',
      interpreter: 'none',
      cron_restart: '0 1,7,13,19 * * *',
      autorestart: false,
      env: {
        PYTHONPATH: '.'
      }
    },
    {
      name: 'reroute-tool',
      script: './.venv/bin/python',
      args: 'tools/ship_reroute_tool.py',
      interpreter: 'none',
      cron_restart: '0 3,9,15,21 * * *',
      autorestart: false,
      env: {
        PYTHONPATH: '.'
      }
    }
  ]
};
