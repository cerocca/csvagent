module.exports = {
  apps: [{
    name: 'csvagent',
    script: 'server.js',
    cwd: '/home/ciru/csvagent',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production'
    },
    env_file: '.env',
    watch: false,
    max_memory_restart: '200M'
  }]
};
